import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import api from "../api/axios";

export interface UnassignedDeliveryAlertData {
  orderId: string;
  orderNumber: string;
  warehouseId?: string;
  deliveryType?: string;
  totalAmount?: number;
  status?: string;
  title: string;
  message: string;
  timeoutSeconds?: number;
  timestamp: string;
}

interface UnassignedDeliveryAlertContextType {
  activeAlert: UnassignedDeliveryAlertData | null;
  alertQueue: UnassignedDeliveryAlertData[];
  dismissAlert: (orderId: string) => void;
  audioEnabled: boolean;
  toggleAudio: () => void;
}

const UnassignedDeliveryAlertContext = createContext<UnassignedDeliveryAlertContextType | undefined>(undefined);

export function UnassignedDeliveryAlertProvider({ children }: { children: React.ReactNode }) {
  const [alertQueue, setAlertQueue] = useState<UnassignedDeliveryAlertData[]>([]);
  const [activeAlert, setActiveAlert] = useState<UnassignedDeliveryAlertData | null>(null);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("unassigned_delivery_alert_audio");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  const seenAlertIdsRef = useRef<Set<string>>(new Set());
  const dismissedAlertIdsRef = useRef<Set<string>>(new Set());
  const alarmRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlocked = useRef<boolean>(false);
  const rootSocketRef = useRef<Socket | null>(null);
  const partnerSocketRef = useRef<Socket | null>(null);

  // 1. Initialize audio element
  useEffect(() => {
    const alarm = new Audio("/sounds/flutie8211-low-pitch-alarm-buzzer-451576.mp3");
    alarm.preload = "auto";
    alarm.loop = false; // Chime once per alert
    alarm.volume = 1.0;
    alarmRef.current = alarm;

    return () => {
      alarm.pause();
      alarm.currentTime = 0;
      alarmRef.current = null;
    };
  }, []);

  // 2. Unlock audio on first user interaction
  const unlockAudio = useCallback(() => {
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
        audioUnlocked.current = true;
        console.log("[UnassignedAudio] Audio unlocked via interaction");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    window.addEventListener("pointerdown", unlockAudio);
    window.addEventListener("keydown", unlockAudio);
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, [unlockAudio]);

  const toggleAudio = useCallback(() => {
    setAudioEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("unassigned_delivery_alert_audio", String(next));
      return next;
    });
  }, []);

  // Synthetic chime fallback using Web Audio API
  const playSyntheticChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.8);
      setTimeout(() => ctx.close().catch(() => {}), 900);
    } catch {
      // AudioContext blocked
    }
  }, []);

  const playChime = useCallback(() => {
    if (!audioEnabled) return;
    const alarm = alarmRef.current;
    if (alarm) {
      alarm.currentTime = 0;
      alarm.play().catch(() => {
        playSyntheticChime();
      });
    } else {
      playSyntheticChime();
    }
  }, [audioEnabled, playSyntheticChime]);

  // 3. Process an incoming alert
  const handleIncomingAlert = useCallback((data: any, shouldChime = true) => {
    const orderId = String(data.orderId || data.id || "");
    if (!orderId) return;

    if (dismissedAlertIdsRef.current.has(orderId)) return;
    if (seenAlertIdsRef.current.has(orderId)) return;

    seenAlertIdsRef.current.add(orderId);

    const alertItem: UnassignedDeliveryAlertData = {
      orderId,
      orderNumber: data.orderNumber || data.order_number || orderId,
      warehouseId: data.warehouseId || data.warehouse_id,
      deliveryType: data.deliveryType || "FAST",
      totalAmount: Number(data.totalAmount || data.total_value || 0),
      status: data.status || "CONFIRMED",
      title: data.title || "Delivery Partner Not Assigned",
      message: data.message || "This order has not been accepted by any delivery partner within 90 seconds. Please check the order and arrange delivery.",
      timeoutSeconds: Number(data.timeoutSeconds || 90),
      timestamp: data.timestamp || new Date().toISOString(),
    };

    setAlertQueue((prev) => {
      if (prev.some((a) => a.orderId === orderId)) return prev;
      return [...prev, alertItem];
    });

    if (shouldChime) {
      playChime();
    }
  }, [playChime]);

  // Promote next alert in queue to active
  useEffect(() => {
    if (!activeAlert && alertQueue.length > 0) {
      const next = alertQueue[0];
      setActiveAlert(next);
      setAlertQueue((prev) => prev.slice(1));
    }
  }, [activeAlert, alertQueue]);

  const dismissAlert = useCallback((orderId: string) => {
    dismissedAlertIdsRef.current.add(orderId);
    setActiveAlert((prev) => (prev?.orderId === orderId ? null : prev));
    setAlertQueue((prev) => prev.filter((a) => a.orderId !== orderId));
  }, []);

  // 4. Polling loop (Runs every 5 seconds to ensure alerts pop up even without sockets)
  useEffect(() => {
    let isMounted = true;
    let isPolling = false;

    const pollUnassignedAlerts = async () => {
      if (isPolling) return;

      // Don't poll if user is on public routes (invoices, login, forgot-password, etc.)
      const currentPath = window.location.pathname || '';
      if (currentPath.startsWith('/invoice') || currentPath.startsWith('/login') || currentPath.startsWith('/forgot-password') || currentPath.startsWith('/create-password')) {
        return;
      }

      // Check if any auth token exists before calling authenticated endpoint
      const token =
        sessionStorage.getItem("staffToken") ||
        sessionStorage.getItem("partnerToken") ||
        sessionStorage.getItem("token") ||
        localStorage.getItem("staffToken") ||
        localStorage.getItem("partnerToken") ||
        localStorage.getItem("token") ||
        localStorage.getItem("authToken");

      if (!token) return;

      isPolling = true;

      try {
        const storedU = localStorage.getItem("partnerUser") || sessionStorage.getItem("staffUser");
        let storeId = "";
        if (storedU) {
          try {
            const u = JSON.parse(storedU);
            storeId = u.warehouseId || u.warehouse_id || "";
          } catch {}
        }

        const endpoint = storeId ? `/orders/unassigned-alerts?store_id=${storeId}` : `/orders/unassigned-alerts`;
        const res = await api.get(endpoint).catch(() => null);

        if (!isMounted || !res?.data || !Array.isArray(res.data)) return;

        res.data.forEach((item: any) => {
          const id = String(item.orderId || item.id || "");
          if (id && !seenAlertIdsRef.current.has(id) && !dismissedAlertIdsRef.current.has(id)) {
            // New unassigned order found! Trigger alert with sound
            handleIncomingAlert(item, true);
          }
        });
      } catch (err) {
        // network or auth error
      } finally {
        isPolling = false;
      }
    };

    // Initial check immediately
    pollUnassignedAlerts();

    // Poll every 5 seconds
    const intervalId = setInterval(pollUnassignedAlerts, 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [handleIncomingAlert]);

  // 5. Dual Socket.IO Listeners (Root socket + /partner namespace)
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

    const storedU = localStorage.getItem("partnerUser") || sessionStorage.getItem("staffUser");
    let storeId = "";
    if (storedU) {
      try {
        const u = JSON.parse(storedU);
        storeId = u.warehouseId || u.warehouse_id || "";
      } catch {}
    }

    // A. Connect to root namespace (like useSocket)
    const rootSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });
    rootSocketRef.current = rootSocket;

    rootSocket.on("connect", () => {
      if (storeId) {
        rootSocket.emit("join:store", { storeId });
      }
    });

    rootSocket.on("order:unassigned_timeout", (data: any) => {
      console.log("[SOCKET:ROOT] Received order:unassigned_timeout", data);
      handleIncomingAlert(data, true);
    });

    // B. Connect to /partner namespace
    const partnerSocket = io(`${SOCKET_URL}/partner`, {
      auth: { token },
      transports: ["websocket", "polling"],
    });
    partnerSocketRef.current = partnerSocket;

    partnerSocket.on("partner:delivery_unassigned_timeout", (data: any) => {
      console.log("[SOCKET:PARTNER] Received partner:delivery_unassigned_timeout", data);
      handleIncomingAlert(data, true);
    });

    partnerSocket.on("order:unassigned_timeout", (data: any) => {
      console.log("[SOCKET:PARTNER] Received order:unassigned_timeout", data);
      handleIncomingAlert(data, true);
    });

    // Auto-dismiss handler when order is assigned to rider or shopkeeper
    const handleOrderAssigned = (data: any) => {
      const orderId = String(data.orderId || data.id || "");
      if (orderId) {
        dismissAlert(orderId);
      }
    };

    rootSocket.on("order:assigned", handleOrderAssigned);
    rootSocket.on("delivery:assigned", handleOrderAssigned);
    partnerSocket.on("partner:delivery_assigned", handleOrderAssigned);
    partnerSocket.on("delivery:assigned", handleOrderAssigned);

    return () => {
      rootSocket.disconnect();
      partnerSocket.disconnect();
      rootSocketRef.current = null;
      partnerSocketRef.current = null;
    };
  }, [handleIncomingAlert, dismissAlert]);

  return (
    <UnassignedDeliveryAlertContext.Provider
      value={{
        activeAlert,
        alertQueue,
        dismissAlert,
        audioEnabled,
        toggleAudio,
      }}
    >
      {children}
    </UnassignedDeliveryAlertContext.Provider>
  );
}

export function useUnassignedDeliveryAlert() {
  const context = useContext(UnassignedDeliveryAlertContext);
  if (!context) {
    return {
      activeAlert: null,
      alertQueue: [],
      dismissAlert: () => {},
      audioEnabled: true,
      toggleAudio: () => {},
    };
  }
  return context;
}
