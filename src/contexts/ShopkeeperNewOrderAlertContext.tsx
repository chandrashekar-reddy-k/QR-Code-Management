import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import api from "../api/axios";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface NewOrderAlertData {
  eventId: string;
  orderId: string;
  orderNumber: string;
  status: "PLACED" | "CONFIRMED" | string;
  customerName: string;
  customerPhone: string;
  paymentMethod: string;
  deliveryAddress: string;
  totalAmount: number;
  itemCount: number;
  fulfillmentType: "HOME_DELIVERY" | "SELF_PICKUP" | string;
  placedAt: string;
  autoConfirmAt: string;
  assignedShopkeeperId?: string | null;
}

interface ShopkeeperNewOrderAlertContextType {
  activeOrder: NewOrderAlertData | null;
  isBuzzing: boolean;
  queueLength: number;
  dismissAlert: (orderId: string, rejected: boolean) => void;
  audioEnabled: boolean;
  enableAudio: () => void;
  disableAudio: () => void;
  toggleAudio: () => void;
}

// -----------------------------------------------------------------------------
// Context
// -----------------------------------------------------------------------------

const ShopkeeperNewOrderAlertContext = createContext<ShopkeeperNewOrderAlertContextType | undefined>(undefined);

// -----------------------------------------------------------------------------
// Provider
// -----------------------------------------------------------------------------

export function ShopkeeperNewOrderAlertProvider({ children }: { children: React.ReactNode }) {
  const [alertQueue, setAlertQueue] = useState<NewOrderAlertData[]>([]);
  const [activeOrder, setActiveOrder] = useState<NewOrderAlertData | null>(null);
  const [isBuzzing, setIsBuzzing] = useState<boolean>(false);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("shopkeeper_order_alert_audio_enabled");
      return saved !== null ? saved === "true" : true; // Default to true if not explicitly disabled
    } catch {
      return true;
    }
  });

  // Refs
  const seenOrderIdsRef = useRef<Set<string>>(new Set());
  const rejectedOrderIdsRef = useRef<Set<string>>(new Set());
  const alarmRef        = useRef<HTMLAudioElement | null>(null);
  const audioUnlocked   = useRef<boolean>(false);
  const socketRef       = useRef<Socket | null>(null);

  // -----------------------------------------------------------------------
  // 1. Create ONE persistent HTMLAudioElement on mount; destroy on unmount
  // -----------------------------------------------------------------------
  useEffect(() => {
    const alarm = new Audio("/sounds/flutie8211-low-pitch-alarm-buzzer-451576.mp3");
    alarm.preload = "auto";
    alarm.loop    = true;
    alarm.volume  = 1.0;
    alarm.onerror = () => console.warn("[ALARM] MP3 failed to load — check public/sounds/");
    alarmRef.current = alarm;

    return () => {
      alarm.pause();
      alarm.currentTime = 0;
      alarmRef.current  = null;
    };
  }, []);

  // -----------------------------------------------------------------------
  // 2. enableAudio — one-time audio unlock via silent play
  // -----------------------------------------------------------------------
  const enableAudio = useCallback(() => {
    localStorage.setItem("shopkeeper_order_alert_audio_enabled", "true");
    setAudioEnabled(true);
    const alarm = alarmRef.current;
    if (!alarm) return;

    if (!audioUnlocked.current) {
      alarm.muted = true;
      alarm
        .play()
        .then(() => {
          alarm.pause();
          alarm.currentTime = 0;
          alarm.muted  = false;
          alarm.volume = 1.0;
          audioUnlocked.current = true;
          console.log("[SK ALARM] Audio unlocked");
        })
        .catch((err) => {
          alarm.muted = false;
          console.warn("[SK ALARM] Unlock attempt blocked:", err.message);
        });
    } else {
      alarm.muted = false;
    }
  }, []);

  const disableAudio = useCallback(() => {
    localStorage.setItem("shopkeeper_order_alert_audio_enabled", "false");
    const alarm = alarmRef.current;
    if (alarm) {
      alarm.pause();
      alarm.currentTime = 0;
      alarm.muted = true;
    }
    setAudioEnabled(false);
    setIsBuzzing(false);
    console.log("[SK ALARM] Audio disabled/muted");
  }, []);

  const toggleAudio = useCallback(() => {
    setAudioEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("shopkeeper_order_alert_audio_enabled", String(next));
      if (!next) {
        if (alarmRef.current) {
          alarmRef.current.pause();
          alarmRef.current.currentTime = 0;
          alarmRef.current.muted = true;
        }
        setIsBuzzing(false);
      } else {
        enableAudio();
      }
      return next;
    });
  }, [enableAudio]);

  const unlockAudioSilent = useCallback(() => {
    if (audioUnlocked.current) return;
    const alarm = alarmRef.current;
    if (!alarm) return;
    alarm.muted = true;
    alarm
      .play()
      .then(() => {
        alarm.pause();
        alarm.currentTime = 0;
        alarm.muted = false;
        alarm.volume = 1.0;
        audioUnlocked.current = true;
        console.log("[SK ALARM] Audio unlocked silently");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    window.addEventListener("pointerdown", unlockAudioSilent);
    window.addEventListener("keydown",     unlockAudioSilent);
    return () => {
      window.removeEventListener("pointerdown", unlockAudioSilent);
      window.removeEventListener("keydown",     unlockAudioSilent);
    };
  }, [unlockAudioSilent]);

  // -----------------------------------------------------------------------
  // 3. playAlarm / stopAlarm
  // -----------------------------------------------------------------------
  const playAlarm = useCallback(() => {
    if (!audioEnabled) {
      console.log("[SK ALARM] Sound muted — skipping playback");
      return;
    }
    const alarm = alarmRef.current;
    if (!alarm) return;
    alarm.currentTime = 0;
    alarm.volume = 1.0;
    alarm.muted  = false;
    alarm
      .play()
      .then(() => {
        setIsBuzzing(true);
      })
      .catch((err) => {
        console.error("[SK ALARM] Playback blocked:", err.message);
      });
  }, [audioEnabled]);

  const stopAlarm = useCallback(() => {
    const alarm = alarmRef.current;
    if (!alarm) return;
    alarm.pause();
    alarm.currentTime = 0;
    setIsBuzzing(false);
  }, []);

  // -----------------------------------------------------------------------
  // 4. handleIncomingOrder — normalise + deduplicate + enqueue
  // -----------------------------------------------------------------------
  const handleIncomingOrder = useCallback((rawOrder: any) => {
    const orderId = String(
      rawOrder.id       ||
      rawOrder.orderId  ||
      rawOrder.order_id ||
      rawOrder.orderNumber ||
      rawOrder.order_number ||
      ""
    );

    if (!orderId) return;
    const status = rawOrder.status?.toUpperCase() || "";
    
    // Shopkeepers only care about CONFIRMED unassigned orders
    if (status !== "CONFIRMED") return;
    if (rawOrder.assignedShopkeeperId || rawOrder.assigned_shopkeeper_id) return;
    if (rejectedOrderIdsRef.current.has(orderId)) return;
    if (seenOrderIdsRef.current.has(orderId)) return;

    seenOrderIdsRef.current.add(orderId);

    const placedAt      = rawOrder.placedAt    || rawOrder.created_at || rawOrder.createdAt || new Date().toISOString();
    const autoConfirmAt = rawOrder.autoConfirmAt || new Date(Date.now() + 30_000).toISOString();

    const formatted: NewOrderAlertData = {
      eventId:         orderId,
      orderId,
      orderNumber:     rawOrder.order_number || rawOrder.orderNumber || orderId,
      status:          "CONFIRMED",
      customerName:    rawOrder.customer_name  || rawOrder.customerName  || rawOrder.userName || rawOrder.consumer?.name || "Customer",
      customerPhone:   rawOrder.customer_phone || rawOrder.customerPhone || rawOrder.phone    || rawOrder.consumer?.phone || "",
      paymentMethod:   rawOrder.payment_method || rawOrder.paymentMethod || rawOrder.paymentMode || "ONLINE",
      deliveryAddress: (() => { const raw = rawOrder.address || rawOrder.deliveryAddress || rawOrder.delivery_address || ""; if (!raw) return ""; if (typeof raw === 'string') return raw; if (typeof raw === 'object') return [raw.line1, raw.line2, raw.city, raw.state, raw.pincode].filter(Boolean).join(', '); return String(raw); })(),
      totalAmount:     Number(rawOrder.total_amount || rawOrder.totalAmount || rawOrder.total || 0),
      itemCount:       rawOrder.item_count || rawOrder.itemCount || rawOrder.items?.length || 1,
      fulfillmentType: rawOrder.fulfillmentType || rawOrder.deliveryType || rawOrder.order_type || "HOME_DELIVERY",
      placedAt,
      autoConfirmAt,
    };

    setAlertQueue((prev) => [...prev, formatted]);
  }, []);

  // -----------------------------------------------------------------------
  // 5. Queue processor
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!activeOrder && alertQueue.length > 0) {
      const next = alertQueue[0];
      setActiveOrder(next);
      setAlertQueue((prev) => prev.slice(1));
      playAlarm();
    }
  }, [activeOrder, alertQueue, playAlarm]);

  // -----------------------------------------------------------------------
  // 6. Dismiss Alert (Accept or Reject)
  // -----------------------------------------------------------------------
  const dismissAlert = useCallback((orderId: string, rejected: boolean) => {
    if (rejected) {
      rejectedOrderIdsRef.current.add(orderId);
      
      // Save locally to update Shopkeeper-specific Rejected KPI on Dashboard
      try {
        const saved = JSON.parse(localStorage.getItem('shopkeeperRejectedIds') || '[]');
        if (!saved.includes(orderId)) {
          saved.push(orderId);
          localStorage.setItem('shopkeeperRejectedIds', JSON.stringify(saved));
          window.dispatchEvent(new Event('shopkeeperRejectedIdsUpdated'));
        }
      } catch (e) {}
    }
    seenOrderIdsRef.current.delete(orderId); // Allow it to re-queue if it hasn't been rejected and hasn't been accepted yet
    stopAlarm();
    setActiveOrder(null);
  }, [stopAlarm]);

  // -----------------------------------------------------------------------
  // 7. Polling fallback — every 5 seconds
  // -----------------------------------------------------------------------
  useEffect(() => {
    let isPolling = false;
    let firstPoll = true;

    const poll = async () => {
      if (isPolling) return;
      isPolling = true;
      try {
        const storedU = localStorage.getItem("partnerUser");
        let userWarehouseId = "";
        if (storedU) {
          try {
            const u = JSON.parse(storedU);
            userWarehouseId = u.warehouseId || u.warehouse_id || u.partnerWarehouseId || "";
          } catch (e) { }
        }

        const endpoint = userWarehouseId ? `/orders?store_id=${userWarehouseId}&view=shopkeeper&status=confirmed` : '/orders?view=shopkeeper&status=confirmed';
        const res = await api.get(endpoint);
        let polled: any[] = [];
        if (Array.isArray(res.data)) polled = res.data;

        if (firstPoll) {
          // Silently absorb all pre-existing CONFIRMED unassigned orders on first load so they don't ring the alarm immediately
          polled.forEach((o) => {
            const id = String(o.id || o.orderId || o.orderNumber || "");
            const status = (o.status || "").toUpperCase();
            if (id && status === "CONFIRMED" && !o.assignedShopkeeperId && !o.assigned_shopkeeper_id) {
              seenOrderIdsRef.current.add(id);
              rejectedOrderIdsRef.current.add(id); // Assume they were seen previously
            }
          });
          firstPoll = false;
        } else {
          polled.forEach((o) => {
            const id = String(o.id || o.orderId || o.orderNumber || "");
            const status = (o.status || "").toUpperCase();
            if (id && status === "CONFIRMED" && !seenOrderIdsRef.current.has(id) && !o.assignedShopkeeperId && !o.assigned_shopkeeper_id) {
              handleIncomingOrder(o);
            }
          });
        }
      } catch (err) {
        // ignore
      } finally {
        isPolling = false;
      }
    };

    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [handleIncomingOrder]);

  // -----------------------------------------------------------------------
  // 8. Socket.IO — listen to order:status and shopkeeper:new_order
  // -----------------------------------------------------------------------
  useEffect(() => {
    const API_URL    = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_URL || "http://localhost:3004";
    const SOCKET_URL = API_URL.replace(/\/api\/v1\/?$/, "").replace(/\/api\/?$/, "").replace(/\/+$/, "");

    let token =
      sessionStorage.getItem("staffToken")   ||
      sessionStorage.getItem("partnerToken") ||
      sessionStorage.getItem("token")        ||
      localStorage.getItem("staffToken")     ||
      localStorage.getItem("partnerToken")   ||
      localStorage.getItem("token")          ||
      localStorage.getItem("authToken")      ||
      localStorage.getItem("accessToken");

    if (token?.startsWith("Bearer ")) token = token.substring(7);
    if (!SOCKET_URL || !token) return;

    const socket = io(`${SOCKET_URL}/partner`, {
      auth:       { token },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    const newOrderEvents = ["order:status", "shopkeeper:new_order", "partner:order_updated"];
    newOrderEvents.forEach((ev) =>
      socket.on(ev, (data: any) => {
        handleIncomingOrder(data);
      })
    );

    const handleAssignmentDismissal = (data: any) => {
      const orderId = String(data.id || data.orderId || "");
      const assignedId = String(data.assignedShopkeeperId || data.assigned_shopkeeper_id || data.shopkeeperId || "");
      
      let currentUserId = "";
      try {
        const storedU = localStorage.getItem("partnerUser") || sessionStorage.getItem("staffUser") || "";
        if (storedU) currentUserId = String(JSON.parse(storedU).id || "");
      } catch (e) {}

      if (activeOrder && orderId === activeOrder.orderId && assignedId) {
        if (assignedId !== currentUserId) {
          import("react-hot-toast").then((module) => {
            module.default.error("Order accepted by another shopkeeper.", {
              icon: "ℹ️",
              style: { background: "#333", color: "#fff" }
            });
          });
        }
        // Active order was accepted by someone else
        dismissAlert(orderId, false); // Just close it, not rejected
      }
      
      // Always remove it from the queue so it doesn't pop up later
      setAlertQueue(q => q.filter(o => o.orderId !== orderId));
    };

    // If an order gets assigned to another shopkeeper, dismiss it locally
    socket.on("order:status", handleAssignmentDismissal);
    socket.on("partner:order_updated", handleAssignmentDismissal);
    
    socket.on("shopkeeper:order_accepted", (data: any) => {
      handleAssignmentDismissal(data);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [handleIncomingOrder, activeOrder, dismissAlert]);

  // -----------------------------------------------------------------------
  // Context value
  // -----------------------------------------------------------------------
  return (
    <ShopkeeperNewOrderAlertContext.Provider
      value={{
        activeOrder,
        isBuzzing,
        queueLength: alertQueue.length,
        dismissAlert,
        audioEnabled,
        enableAudio,
        disableAudio,
        toggleAudio,
      }}
    >
      {children}
    </ShopkeeperNewOrderAlertContext.Provider>
  );
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------
export function useShopkeeperNewOrderAlert() {
  const context = useContext(ShopkeeperNewOrderAlertContext);
  if (!context) throw new Error("useShopkeeperNewOrderAlert must be used within a ShopkeeperNewOrderAlertProvider");
  return context;
}
