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
  customerPhone?: string;
  paymentMethod?: string;
  deliveryAddress?: string;
  customerAddress?: string;
  totalAmount: number;
  itemCount?: number;
  items?: any[];
  fulfillmentType: "HOME_DELIVERY" | "SELF_PICKUP" | string;
  placedAt: string;
  autoConfirmAt: string;
  assignedShopkeeperId?: string | null;
}

interface ShopkeeperNewOrderAlertContextType {
  activeOrder: NewOrderAlertData | null;
  countdown: number;
  isBuzzing: boolean;
  queueLength: number;
  dismissAlert: (orderId: string, rejected?: boolean) => void;
  audioEnabled: boolean;
  enableAudio: () => void;
  disableAudio: () => void;
  toggleAudio: () => void;
  acceptAlertOrder: (orderId: string) => Promise<void>;
  rejectAlertOrder: (orderId: string) => Promise<void>;
  silenceAlarm: () => void;
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
  const [countdown, setCountdown] = useState<number>(30);
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

    // Register FCM Web Push token for background OS notifications
    import("../utils/firebase").then(({ requestFcmToken }) => {
      requestFcmToken();
    }).catch(() => {});

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

  const synthIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopSynthAlarm = useCallback(() => {
    if (synthIntervalRef.current) {
      clearInterval(synthIntervalRef.current);
      synthIntervalRef.current = null;
    }
  }, []);

  const playSynthAlarm = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const beep = () => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(800, ctx.currentTime);
          osc.frequency.setValueAtTime(600, ctx.currentTime + 0.15);
          gain.gain.setValueAtTime(0.5, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.35);
        } catch (e) {}
      };

      beep();
      if (!synthIntervalRef.current) {
        synthIntervalRef.current = setInterval(beep, 600);
      }
    } catch (e) {}
  }, []);

  const playAlarm = useCallback(() => {
    if (!audioEnabled) return;
    const alarm = alarmRef.current;
    if (alarm) {
      alarm.currentTime = 0;
      alarm.volume = 1.0;
      alarm.muted  = false;
      alarm.play().then(() => {
        setIsBuzzing(true);
      }).catch(() => {
        playSynthAlarm();
        setIsBuzzing(true);
      });
    } else {
      playSynthAlarm();
      setIsBuzzing(true);
    }
  }, [audioEnabled, playSynthAlarm]);

  const stopAlarm = useCallback(() => {
    const alarm = alarmRef.current;
    if (alarm) {
      alarm.pause();
      alarm.currentTime = 0;
    }
    stopSynthAlarm();
    setIsBuzzing(false);
  }, [stopSynthAlarm]);

  const handleIncomingOrder = useCallback((rawOrder: any) => {
    const orderId = String(rawOrder.id || rawOrder.orderId || rawOrder.order_id || rawOrder.orderNumber || "");
    if (!orderId) return;
    const status = rawOrder.status?.toUpperCase() || "";
    
    if (!["CONFIRMED", "PLACED", "PENDING", "NEW"].includes(status)) return;
    if (rawOrder.assignedShopkeeperId || rawOrder.assigned_shopkeeper_id) return;
    if (rejectedOrderIdsRef.current.has(orderId)) return;
    if (seenOrderIdsRef.current.has(orderId)) return;

    seenOrderIdsRef.current.add(orderId);

    const formatted: NewOrderAlertData = {
      eventId:         orderId,
      orderId,
      orderNumber:     rawOrder.order_number || rawOrder.orderNumber || orderId,
      status:          "CONFIRMED",
      items:           (rawOrder.items || []).map((i: any) => ({
        id:          String(i.id || i.productId || ""),
        name:        i.name || i.product_name || i.product?.name || "Item",
        quantity:    i.quantity || 1,
        unitPrice:   i.price || i.unitPrice || 0,
        image:       i.image_url || i.image || "",
        aisleLocation: i.aisle_location || i.aisleLocation || undefined,
      })),
      totalAmount:     rawOrder.total_value || rawOrder.totalAmount || 0,
      customerName:    rawOrder.customer_name || rawOrder.consumer?.name || "Customer",
      customerAddress: rawOrder.customer_address || (rawOrder.address ? `${rawOrder.address.line1 || ""}, ${rawOrder.address.city || ""}` : ""),
      fulfillmentType: rawOrder.order_type || rawOrder.fulfillmentType || "HOME_DELIVERY",
      placedAt:        rawOrder.placedAt || rawOrder.created_at || new Date().toISOString(),
      autoConfirmAt:   rawOrder.autoConfirmAt || new Date(Date.now() + 30_000).toISOString(),
    };

    setAlertQueue((prev) => {
      if (prev.some((a) => a.orderId === orderId)) return prev;
      return [...prev, formatted];
    });

    playAlarm();
  }, [playAlarm]);

  useEffect(() => {
    if (!activeOrder && alertQueue.length > 0) {
      const next = alertQueue[0];
      setActiveOrder(next);
      setAlertQueue((prev) => prev.slice(1));
    }
  }, [activeOrder, alertQueue]);

  useEffect(() => {
    if (!activeOrder) {
      setCountdown(30);
      return;
    }
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeOrder]);

  const dismissAlert = useCallback((orderId: string, rejected: boolean = false) => {
    if (rejected) {
      rejectedOrderIdsRef.current.add(orderId);
      try {
        const saved = JSON.parse(localStorage.getItem('shopkeeperRejectedIds') || '[]');
        if (!saved.includes(orderId)) {
          saved.push(orderId);
          localStorage.setItem('shopkeeperRejectedIds', JSON.stringify(saved));
          window.dispatchEvent(new Event('shopkeeperRejectedIdsUpdated'));
        }
      } catch (e) {}
    }
    stopAlarm();
    setActiveOrder(null);
  }, [stopAlarm]);

  const acceptAlertOrder = useCallback(async (orderId: string) => {
    dismissAlert(orderId, false);
    try { await api.post(`/orders/${orderId}/accept-shopkeeper`); } catch (err) {}
    setCountdown(30);
  }, [dismissAlert]);

  const rejectAlertOrder = useCallback(async (orderId: string) => {
    dismissAlert(orderId, true);
    try { await api.post(`/orders/${orderId}/reject-shopkeeper`); } catch (err) {}
    setCountdown(30);
  }, [dismissAlert]);

  const silenceAlarm = useCallback(() => {
    stopAlarm();
  }, [stopAlarm]);

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
            userWarehouseId = u.warehouseId || u.warehouse_id || "";
          } catch (e) {}
        }
        const endpoint = userWarehouseId ? `/orders?store_id=${userWarehouseId}&view=shopkeeper&status=new` : '/orders?view=shopkeeper&status=new';
        const res = await api.get(endpoint);
        let polled: any[] = Array.isArray(res.data) ? res.data : [];
        if (firstPoll) {
          polled.forEach((o) => {
            const id = String(o.id || o.orderId || o.orderNumber || "");
            const status = (o.status || "").toUpperCase();
            if (id && ["NEW", "CONFIRMED", "PLACED", "PENDING"].includes(status) && !o.assignedShopkeeperId && !o.assigned_shopkeeper_id) {
              seenOrderIdsRef.current.add(id);
              rejectedOrderIdsRef.current.add(id);
            }
          });
          firstPoll = false;
        } else {
          polled.forEach((o) => {
            const id = String(o.id || o.orderId || o.orderNumber || "");
            const status = (o.status || "").toUpperCase();
            if (id && ["NEW", "CONFIRMED", "PLACED", "PENDING"].includes(status) && !seenOrderIdsRef.current.has(id) && !o.assignedShopkeeperId && !o.assigned_shopkeeper_id) {
              handleIncomingOrder(o);
            }
          });
        }
      } catch (err) {} finally { isPolling = false; }
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
            module.default.dismiss(orderId); // Clear related toast if any
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
    socket.on("order-claimed", handleAssignmentDismissal);
    
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
        countdown,
        isBuzzing,
        queueLength: alertQueue.length,
        dismissAlert,
        audioEnabled,
        enableAudio,
        disableAudio,
        toggleAudio,
        acceptAlertOrder,
        rejectAlertOrder,
        silenceAlarm,
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
  if (!context) {
    return {
      activeOrder: null,
      countdown: 30,
      isBuzzing: false,
      queueLength: 0,
      audioEnabled: true,
      enableAudio: () => {},
      disableAudio: () => {},
      toggleAudio: () => {},
      dismissAlert: () => {},
      acceptAlertOrder: async () => {},
      rejectAlertOrder: async () => {},
      silenceAlarm: () => {},
    };
  }
  return context;
}
