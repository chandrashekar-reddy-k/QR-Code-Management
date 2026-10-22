/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import api from "../api/axios";
import toast from "react-hot-toast";

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
}

export interface TodayStats {
  newCount: number;
  pendingCount: number;
  confirmedCount: number;
  completedCount: number;
}

interface NewOrderAlertContextType {
  activeOrder: NewOrderAlertData | null;
  countdown: number;
  isBuzzing: boolean;
  queueLength: number;
  todayStats: TodayStats;
  dismissAlert: () => void;
  audioEnabled: boolean;
  enableAudio: () => void;
  disableAudio: () => void;
  toggleAudio: () => void;
  refetchStats: () => Promise<void>;
  acceptOrder: (orderId: string) => Promise<void>;
}

// -----------------------------------------------------------------------------
// Context
// -----------------------------------------------------------------------------

const NewOrderAlertContext = createContext<NewOrderAlertContextType | undefined>(undefined);

// -----------------------------------------------------------------------------
// Provider
// -----------------------------------------------------------------------------

export function NewOrderAlertProvider({ children }: { children: React.ReactNode }) {
  const [alertQueue, setAlertQueue] = useState<NewOrderAlertData[]>([]);
  const [activeOrder, setActiveOrder] = useState<NewOrderAlertData | null>(null);
  const [countdown, setCountdown] = useState<number>(30);
  const [isBuzzing, setIsBuzzing] = useState<boolean>(false);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("order_alert_audio_enabled");
      return saved !== null ? saved === "true" : true; // Default to true if not explicitly disabled
    } catch {
      return true;
    }
  });
  const [todayStats, setTodayStats] = useState<TodayStats>({
    newCount: 0,
    pendingCount: 0,
    confirmedCount: 0,
    completedCount: 0,
  });

  // Refs
  const seenOrderIdsRef = useRef<Set<string>>(new Set());
  const alarmRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlocked = useRef<boolean>(false);
  const socketRef = useRef<Socket | null>(null);

  // -----------------------------------------------------------------------
  // 1. Create ONE persistent HTMLAudioElement on mount; destroy on unmount
  // -----------------------------------------------------------------------
  useEffect(() => {
    const alarm = new Audio();
    alarm.preload = "auto";
    alarm.loop = true;
    alarm.volume = 1.0;
    alarm.onerror = () => {
      // Gracefully handle browser audio caching restriction
    };
    alarm.src = "/sounds/flutie8211-low-pitch-alarm-buzzer-451576.mp3";
    alarmRef.current = alarm;

    // Register FCM Web Push token for background OS notifications
    import("../utils/firebase").then(({ requestFcmToken }) => {
      requestFcmToken();
    }).catch(() => { });

    return () => {
      alarm.pause();
      alarm.currentTime = 0;
      alarmRef.current = null;
    };
  }, []);

  // -----------------------------------------------------------------------
  // 2. enableAudio — one-time audio unlock via silent play (MUST be called
  //    from a real user-gesture click chain)
  // -----------------------------------------------------------------------
  const enableAudio = useCallback(() => {
    localStorage.setItem("order_alert_audio_enabled", "true");
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
          alarm.muted = false;
          alarm.volume = 1.0;
          audioUnlocked.current = true;
          console.log("[ALARM] Audio unlocked — alarm will play on next new order");
        })
        .catch((err) => {
          alarm.muted = false;
          console.warn("[ALARM] Unlock attempt blocked:", err.message);
        });
    } else {
      alarm.muted = false;
    }
  }, []);

  const disableAudio = useCallback(() => {
    localStorage.setItem("order_alert_audio_enabled", "false");
    const alarm = alarmRef.current;
    if (alarm) {
      alarm.pause();
      alarm.currentTime = 0;
      alarm.muted = true;
    }
    setAudioEnabled(false);
    setIsBuzzing(false);
    console.log("[ALARM] Audio disabled/muted");
  }, []);

  const toggleAudio = useCallback(() => {
    setAudioEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("order_alert_audio_enabled", String(next));
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

  const unlockAudioSilent = useCallback(() => {
    if (audioUnlocked.current) return;
    const alarm = alarmRef.current;
    if (alarm) {
      alarm.muted = true;
      alarm
        .play()
        .then(() => {
          alarm.pause();
          alarm.currentTime = 0;
          alarm.muted = false;
          alarm.volume = 1.0;
          audioUnlocked.current = true;
          console.log("[ALARM] Audio unlocked silently");
        })
        .catch(() => { });
    }
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const dummyCtx = new AudioCtx();
        dummyCtx.resume().then(() => {
          dummyCtx.close().catch(() => {});
          audioUnlocked.current = true;
        }).catch(() => {});
      }
    } catch {}
  }, []);

  useEffect(() => {
    const onInteract = () => {
      unlockAudioSilent();
      if (activeOrder && isBuzzing) {
        const alarm = alarmRef.current;
        if (alarm && alarm.paused && audioEnabled) {
          alarm.currentTime = 0;
          alarm.muted = false;
          alarm.volume = 1.0;
          alarm.play().catch(() => {});
        }
      }
    };
    window.addEventListener("pointerdown", onInteract);
    window.addEventListener("keydown", onInteract);
    window.addEventListener("click", onInteract);
    return () => {
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
      window.removeEventListener("click", onInteract);
    };
  }, [unlockAudioSilent, activeOrder, isBuzzing, audioEnabled]);

  // -----------------------------------------------------------------------
  // 3. playAlarm / stopAlarm
  // -----------------------------------------------------------------------
  const playAlarm = useCallback(() => {
    if (!audioEnabled) {
      console.log("[ALARM] Sound muted by user — skipping playback");
      return;
    }
    const alarm = alarmRef.current;
    if (alarm) {
      alarm.currentTime = 0;
      alarm.volume = 1.0;
      alarm.muted = false;
      alarm
        .play()
        .then(() => {
          setIsBuzzing(true);
          console.log("[ALARM] Playing alarm sound");
        })
        .catch((err) => {
          console.warn("[ALARM] HTML5 audio blocked, falling back to Web Audio buzzer:", err.message);
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
    console.log("[ALARM] Stopped");
  }, [stopSynthAlarm]);

  // -----------------------------------------------------------------------
  // 4. handleIncomingOrder — normalise + deduplicate + enqueue
  //    Does NOT call playAlarm() — alarm fires in queue processor below.
  // -----------------------------------------------------------------------
  interface RawIncomingOrder {
    id?: string;
    orderId?: string;
    order_id?: string;
    orderNumber?: string;
    order_number?: string;
    placedAt?: string;
    created_at?: string;
    createdAt?: string;
    autoConfirmAt?: string;
    status?: string;
    customer_name?: string;
    customerName?: string;
    userName?: string;
    customer_phone?: string;
    customerPhone?: string;
    phone?: string;
    payment_method?: string;
    paymentMethod?: string;
    paymentMode?: string;
    address?: string | { line1?: string; line2?: string; city?: string; state?: string; pincode?: string };
    deliveryAddress?: string | { line1?: string; line2?: string; city?: string; state?: string; pincode?: string };
    delivery_address?: string | { line1?: string; line2?: string; city?: string; state?: string; pincode?: string };
    total_amount?: number | string;
    totalAmount?: number | string;
    total?: number | string;
    item_count?: number;
    itemCount?: number;
    items?: unknown[];
    fulfillmentType?: string;
    deliveryType?: string;
    order_type?: string;
  }

  const handleIncomingOrder = useCallback((rawOrder: RawIncomingOrder) => {
    const orderId = String(
      rawOrder.id ||
      rawOrder.orderId ||
      rawOrder.order_id ||
      rawOrder.orderNumber ||
      rawOrder.order_number ||
      ""
    );

    if (!orderId) {
      console.warn("[NEW ORDER] Received order with no ID — ignoring");
      return;
    }

    // Global deduplication: socket + polling cannot re-queue the same order
    if (seenOrderIdsRef.current.has(orderId)) return;
    seenOrderIdsRef.current.add(orderId);

    console.log("[NEW ORDER] Queuing:", orderId);

    const placedAt = rawOrder.placedAt || rawOrder.created_at || rawOrder.createdAt || new Date().toISOString();
    const autoConfirmAt = rawOrder.autoConfirmAt || new Date(Date.now() + 30_000).toISOString();

    const formatted: NewOrderAlertData = {
      eventId: orderId,
      orderId,
      orderNumber: rawOrder.order_number || rawOrder.orderNumber || orderId,
      status: rawOrder.status?.toUpperCase() || "PLACED",
      customerName: rawOrder.customer_name || rawOrder.customerName || rawOrder.userName || "Customer",
      customerPhone: rawOrder.customer_phone || rawOrder.customerPhone || rawOrder.phone || "",
      paymentMethod: rawOrder.payment_method || rawOrder.paymentMethod || rawOrder.paymentMode || "ONLINE",
      deliveryAddress: (() => { const raw = rawOrder.address || rawOrder.deliveryAddress || rawOrder.delivery_address || ""; if (!raw) return ""; if (typeof raw === 'string') return raw; if (typeof raw === 'object') return [raw.line1, raw.line2, raw.city, raw.state, raw.pincode].filter(Boolean).join(', '); return String(raw); })(),
      totalAmount: Number(rawOrder.total_amount || rawOrder.totalAmount || rawOrder.total || 0),
      itemCount: rawOrder.item_count || rawOrder.itemCount || rawOrder.items?.length || 1,
      fulfillmentType: rawOrder.fulfillmentType || rawOrder.deliveryType || rawOrder.order_type || "HOME_DELIVERY",
      placedAt,
      autoConfirmAt,
    };

    setAlertQueue((prev) => [...prev, formatted]);
    setTodayStats((prev) => ({ ...prev, newCount: prev.newCount + 1 }));

    // Trigger Web Browser Desktop Notification
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        try {
          const notif = new Notification("🚨 NEW ORDER RECEIVED!", {
            body: `Order #${formatted.orderNumber} • ₹${formatted.totalAmount} • ${formatted.itemCount} items\nCustomer: ${formatted.customerName}`,
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            tag: formatted.orderId,
            requireInteraction: true,
          });
          notif.onclick = () => {
            window.focus();
            notif.close();
          };
        } catch {
          if ("serviceWorker" in navigator) {
            navigator.serviceWorker.ready.then((reg) => {
              reg.showNotification("🚨 NEW ORDER RECEIVED!", {
                body: `Order #${formatted.orderNumber} • ₹${formatted.totalAmount} • ${formatted.itemCount} items`,
                icon: "/favicon.ico",
                tag: formatted.orderId,
              });
            }).catch(() => { });
          }
        }
      } else if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => { });
      }
    }
  }, []);

  // Debug helper: testNewOrder() in browser console
  useEffect(() => {
    (window as Window & { testNewOrder?: () => void }).testNewOrder = () =>
      handleIncomingOrder({
        id: `TEST-${Math.floor(Math.random() * 99999)}`,
        orderNumber: `VK-${Math.floor(Math.random() * 99999)}`,
        status: "PLACED",
        totalAmount: 1250,
        itemCount: 3,
        autoConfirmAt: new Date(Date.now() + 30_000).toISOString(),
        placedAt: new Date().toISOString(),
      });
    return () => {
      (window as Window & { testNewOrder?: unknown }).testNewOrder = undefined;
    };
  }, [handleIncomingOrder]);

  // -----------------------------------------------------------------------
  // 5. Queue processor — promote next order ? activeOrder + start alarm
  //    playAlarm() is called ONCE here per unique order, never inside polling.
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
  // 6. Countdown timer — auto-dismiss at autoConfirmAt
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!activeOrder) return;

    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((new Date(activeOrder.autoConfirmAt).getTime() - Date.now()) / 1000)
      );
      setCountdown(remaining);
      if (remaining <= 0) {
        stopAlarm();
        setActiveOrder(null);
      }
    };

    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [activeOrder, stopAlarm]);



  // -----------------------------------------------------------------------
  // 7. dismissAlert
  // -----------------------------------------------------------------------
  const dismissAlert = useCallback(() => {
    stopAlarm();
    setActiveOrder(null);
  }, [stopAlarm]);

  // -----------------------------------------------------------------------
  // 8. refetchStats — stats only, no alarm side effects
  // -----------------------------------------------------------------------
  const refetchStats = useCallback(async () => {
    try {
      const [dRes, pRes] = await Promise.allSettled([
        api.get("partner/orders/delivery?page=1&limit=50"),
        api.get("partner/orders/pickup-store?page=1&limit=50"),
      ]);

      const orders: Record<string, unknown>[] = [];
      if (dRes.status === "fulfilled") {
        const d = dRes.value.data?.data?.orders || dRes.value.data?.orders || [];
        if (Array.isArray(d)) orders.push(...d as Record<string, unknown>[]);
      }
      if (pRes.status === "fulfilled") {
        const p = pRes.value.data?.data?.orders || pRes.value.data?.orders || [];
        if (Array.isArray(p)) orders.push(...p as Record<string, unknown>[]);
      }

      let newC = 0, pendingC = 0, confirmedC = 0, completedC = 0;
      try {
        const statsRes = await api.get("partner/orders/warehouse-stats");
        const s = statsRes.data?.data || statsRes.data || {};
        newC = s.new || 0;
        pendingC = s.pending || 0;
        confirmedC = s.packing || 0;
        completedC = s.ready || 0;
      } catch {
        for (const o of orders) {
          const s = (o.status as string)?.toUpperCase() || "";
          if (s === "PLACED") newC++;
          else if (s === "PENDING") pendingC++;
          else if (["CONFIRMED", "ACCEPTED", "PICKING", "PACKING", "READY_FOR_PICKUP"].includes(s)) confirmedC++;
          else if (["DELIVERED", "COMPLETED", "DISPATCHED"].includes(s)) completedC++;
        }
      }

      setTodayStats({ newCount: newC, pendingCount: pendingC, confirmedCount: confirmedC, completedCount: completedC });
    } catch (err: unknown) {
      const error = err as { response?: { status?: number }; message?: string };
      if (error?.response?.status !== 401) console.warn("[STATS] Fetch failed:", error?.message);
    }
  }, []);

  const acceptOrder = useCallback(async (orderId: string) => {
    try {
      try {
        await api.put(`/orders/${orderId}/accept`);
      } catch {
        try {
          await api.put(`/partner/orders/${orderId}/status`, { status: "CONFIRMED" });
        } catch {
          await api.put(`/orders/${orderId}/status`, { status: "CONFIRMED" });
        }
      }
      toast.success("Order accepted successfully!");
      setActiveOrder((prev) => (prev && prev.orderId === orderId ? { ...prev, status: "CONFIRMED" } : prev));
      refetchStats();
      stopAlarm();
    } catch (err) {
      console.error("[ALARM] Failed to accept order:", err);
      toast.error("Failed to accept order");
    }
  }, [refetchStats, stopAlarm]);

  // -----------------------------------------------------------------------
  // 9. Polling fallback — 5 s interval
  //    First poll: absorb existing PLACED orders silently (no alarm on load)
  //    Subsequent polls: new orderId not in seenOrderIds ? handleIncomingOrder
  // -----------------------------------------------------------------------
  useEffect(() => {
    let isPolling = false;
    let firstPoll = true;

    const poll = async () => {
      if (isPolling) return;
      isPolling = true;
      try {
        const [dRes, pRes] = await Promise.allSettled([
          api.get("partner/orders/delivery?status=PLACED&limit=10"),
          api.get("partner/orders/pickup-store?status=PLACED&limit=10"),
        ]);

        const polled: Record<string, unknown>[] = [];
        if (dRes.status === "fulfilled") {
          const d = dRes.value.data?.data?.orders || dRes.value.data?.orders || [];
          if (Array.isArray(d)) polled.push(...d);
        }
        if (pRes.status === "fulfilled") {
          const p = pRes.value.data?.data?.orders || pRes.value.data?.orders || [];
          if (Array.isArray(p)) polled.push(...p);
        }

        if (firstPoll) {
          // Silently absorb all pre-existing PLACED orders on first load
          polled.forEach((o) => {
            const id = String(o.id || o.orderId || o.orderNumber || "");
            if (id) seenOrderIdsRef.current.add(id);
          });
          firstPoll = false;
          console.log(`[POLLING] Initial snapshot: ${polled.length} existing PLACED orders absorbed (no alarm)`);
        } else {
          polled.forEach((o) => {
            const id = String(o.id || o.orderId || o.orderNumber || "");
            if (id && !seenOrderIdsRef.current.has(id)) {
              console.log("[POLLING] New order detected:", id);
              handleIncomingOrder(o);
            }
          });
        }
      } catch (err) {
        console.warn("[POLLING] Error:", err);
      } finally {
        isPolling = false;
      }
    };

    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [handleIncomingOrder]);

  // -----------------------------------------------------------------------
  // 10. Socket.IO — primary real-time channel
  // -----------------------------------------------------------------------
  useEffect(() => {
    const API_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_URL || "http://localhost:3004";
    const SOCKET_URL = API_URL.replace(/\/api\/v1\/?$/, "").replace(/\/api\/?$/, "").replace(/\/+$/, "");

    let token =
      sessionStorage.getItem("staffToken") ||
      sessionStorage.getItem("partnerToken") ||
      sessionStorage.getItem("token") ||
      localStorage.getItem("staffToken") ||
      localStorage.getItem("partnerToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("accessToken");

    if (token?.startsWith("Bearer ")) token = token.substring(7);
    if (!SOCKET_URL || !token) return;

    const socket = io(`${SOCKET_URL}/partner`, {
      auth: { token },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => console.log("[SOCKET] Connected to /partner namespace"));
    socket.on("connect_error", (err: { message: string }) => console.error("[SOCKET] Connection error:", err.message));
    socket.onAny((event: string, ...args: unknown[]) => console.log("[SOCKET EVENT]", event, args));

    const newOrderEvents = ["partner:new_order", "order:new", "order:created", "partner:order_created", "NEW_ORDER"];
    newOrderEvents.forEach((ev) =>
      socket.on(ev, (data: unknown) => {
        console.log(`[SOCKET] ${ev} received`);
        handleIncomingOrder(data as RawIncomingOrder);
      })
    );

    socket.on("partner:order_updated", (data: { status?: string; orderId?: string; id?: string }) => {
      refetchStats();
      if (
        activeOrder &&
        data.status === "CONFIRMED" &&
        (data.orderId === activeOrder.orderId || data.id === activeOrder.orderId)
      ) {
        stopAlarm();
        setActiveOrder((prev) => (prev ? { ...prev, status: "CONFIRMED" } : null));
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [handleIncomingOrder, refetchStats, activeOrder, stopAlarm]);

  // -----------------------------------------------------------------------
  // Context value
  // -----------------------------------------------------------------------
  return (
    <NewOrderAlertContext.Provider
      value={{
        activeOrder,
        countdown,
        isBuzzing,
        queueLength: alertQueue.length,
        todayStats,
        dismissAlert,
        audioEnabled,
        enableAudio,
        disableAudio,
        toggleAudio,
        refetchStats,
        acceptOrder,
      }}
    >
      {children}
    </NewOrderAlertContext.Provider>
  );
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------
export function useNewOrderAlert() {
  const context = useContext(NewOrderAlertContext);
  if (!context) {
    return {
      activeOrder: null,
      countdown: 30,
      isBuzzing: false,
      queueLength: 0,
      todayStats: null,
      audioEnabled: true,
      enableAudio: () => { },
      disableAudio: () => { },
      toggleAudio: () => { },
      dismissAlert: () => { },
      acceptOrder: async () => { },
    };
  }
  return context;
}
