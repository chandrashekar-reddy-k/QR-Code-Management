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

export function getPartnerOrShopkeeperContext(): {
  isAllowed: boolean;
  role: "PARTNER" | "SHOPKEEPER" | "ADMIN" | null;
  warehouseId: string | null;
} {
  try {
    // If route path is agent portal, delivery, or packing portal, never allow alerts or sound
    if (typeof window !== "undefined") {
      const path = (window.location?.pathname || "").toLowerCase();
      if (
        path.startsWith("/vsms/agent-portal") ||
        path.startsWith("/delivery") ||
        path.startsWith("/packer") ||
        path.startsWith("/login") ||
        path.startsWith("/create-password")
      ) {
        return { isAllowed: false, role: null, warehouseId: null };
      }
    }

    const portalMode = (sessionStorage.getItem("portalMode") || localStorage.getItem("portalMode") || "").toUpperCase();

    // Explicitly reject delivery agents, riders, QC, and operators
    if (["AGENT", "QC", "OPERATOR", "DELIVERY", "RIDER"].includes(portalMode)) {
      return { isAllowed: false, role: null, warehouseId: null };
    }

    const raw =
      sessionStorage.getItem("staffUser") ||
      localStorage.getItem("staffUser") ||
      localStorage.getItem("partnerUser") ||
      localStorage.getItem("user");
    if (!raw) return { isAllowed: false, role: null, warehouseId: null };

    const user = JSON.parse(raw);
    const roleUpper = String(user.role || "").toUpperCase();
    const customRolePortalType = String(user.customRole?.portalType || "").toUpperCase();
    const customRoleNameUpper = String(user.customRole?.name || "").toUpperCase();
    const userPermissions: string[] = Array.isArray(user.permissions)
      ? user.permissions
      : Array.isArray(user.flatPermissions)
      ? user.flatPermissions
      : [];

    // Explicit check for delivery/vehicle/vsms agents and riders
    const isAgent =
      ["VEHICLE_AGENT", "DELIVERY_AGENT", "SALES_AGENT", "VSMS_AGENT", "AGENT", "RIDER", "DRIVER"].includes(roleUpper) ||
      ["VEHICLE_AGENT", "DELIVERY_AGENT", "SALES_AGENT", "VSMS_AGENT"].includes(customRolePortalType) ||
      customRoleNameUpper.includes("AGENT") ||
      customRoleNameUpper.includes("RIDER") ||
      customRoleNameUpper.includes("DRIVER") ||
      roleUpper.includes("AGENT") ||
      roleUpper.includes("RIDER") ||
      roleUpper.includes("DRIVER") ||
      userPermissions.some((p: string) => p.startsWith("vsms_agent_") || p.includes("vehicle_agent"));

    const isOperator =
      ["PACKING_OPERATOR", "PACKER_OPERATOR", "OPERATOR", "PACKER"].includes(roleUpper) ||
      ["PACKING_OPERATOR", "PACKER_OPERATOR", "OPERATOR", "PACKER"].includes(customRolePortalType) ||
      userPermissions.some((p: string) => p.startsWith("packer_operator") || p.startsWith("packing_operator"));

    const isQc =
      ["PACKING_QC", "PACKER_QC", "QC_INSPECTOR", "QC"].includes(roleUpper) ||
      ["PACKING_QC", "PACKER_QC", "QC_INSPECTOR", "QC"].includes(customRolePortalType) ||
      userPermissions.some((p: string) => p.startsWith("packer_qc") || p.startsWith("packing_qc"));

    if (isAgent || isOperator || isQc) {
      return { isAllowed: false, role: null, warehouseId: null };
    }

    const warehouseId =
      user.warehouseId ||
      user.warehouse_id ||
      user.storeId ||
      user.store_id ||
      (typeof localStorage !== "undefined" ? localStorage.getItem("partnerWarehouseId") : null) ||
      null;

    const isAdmin =
      ["SUPER_ADMIN", "ADMIN", "OPERATIONAL_ADMIN", "OPS_ADMIN", "REGIONAL_ADMIN"].includes(roleUpper) ||
      customRolePortalType.includes("ADMIN") ||
      customRoleNameUpper.includes("ADMIN");

    if (isAdmin) {
      return { isAllowed: true, role: "ADMIN", warehouseId };
    }

    const isShopkeeper =
      portalMode === "SHOPKEEPER" ||
      roleUpper === "SHOPKEEPER" ||
      roleUpper.includes("SHOPKEEPER") ||
      customRolePortalType.includes("SHOPKEEPER") ||
      customRoleNameUpper.includes("SHOPKEEPER") ||
      userPermissions.some((p: string) => p.startsWith("shopkeeper_") || p.startsWith("partner_shopkeeper_erp_"));

    if (isShopkeeper) {
      return { isAllowed: true, role: "SHOPKEEPER", warehouseId };
    }

    const isPartner =
      portalMode === "PARTNER" ||
      ["PARTNER", "OWNER", "DIRECTOR", "MANAGER"].includes(roleUpper) ||
      roleUpper.includes("PARTNER") ||
      customRolePortalType.includes("PARTNER") ||
      customRoleNameUpper.includes("PARTNER");

    if (isPartner) {
      return { isAllowed: true, role: "PARTNER", warehouseId };
    }

    // Fallback: If on shopkeeper portal or partner OMS dashboard and not an agent/operator/qc, allow!
    if (typeof window !== "undefined") {
      const path = (window.location?.pathname || "").toLowerCase();
      if (path.startsWith("/shopkeeper")) {
        return { isAllowed: true, role: "SHOPKEEPER", warehouseId };
      }
      if (!path.startsWith("/vsms") && !path.startsWith("/packer") && !path.startsWith("/delivery")) {
        return { isAllowed: true, role: "PARTNER", warehouseId };
      }
    }

    return { isAllowed: false, role: null, warehouseId: null };
  } catch {
    return { isAllowed: false, role: null, warehouseId: null };
  }
}

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
  const synthIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rootSocketRef = useRef<Socket | null>(null);
  const partnerSocketRef = useRef<Socket | null>(null);

  // 1. Initialize audio element
  useEffect(() => {
    const alarm = new Audio("/sounds/flutie8211-low-pitch-alarm-buzzer-451576.mp3");
    alarm.preload = "auto";
    alarm.loop = true; // Continuous alarm while unassigned alert is active
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
    if (alarm) {
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
      unlockAudio();
      if (activeAlert) {
        const alarm = alarmRef.current;
        if (alarm && alarm.paused && audioEnabled) {
          alarm.currentTime = 0;
          alarm.loop = true;
          alarm.muted = false;
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
  }, [unlockAudio, activeAlert, audioEnabled]);

  const toggleAudio = useCallback(() => {
    setAudioEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("unassigned_delivery_alert_audio", String(next));
      if (!next) {
        if (alarmRef.current) {
          alarmRef.current.pause();
          alarmRef.current.currentTime = 0;
        }
        if (synthIntervalRef.current) {
          clearInterval(synthIntervalRef.current);
          synthIntervalRef.current = null;
        }
      }
      return next;
    });
  }, []);

  const stopBuzzer = useCallback(() => {
    if (alarmRef.current) {
      alarmRef.current.pause();
      alarmRef.current.currentTime = 0;
    }
    if (synthIntervalRef.current) {
      clearInterval(synthIntervalRef.current);
      synthIntervalRef.current = null;
    }
  }, []);

  // Synthetic repeating alarm buzzer using Web Audio API
  const playSyntheticBuzzer = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const beep = () => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(800, ctx.currentTime);
          osc.frequency.setValueAtTime(550, ctx.currentTime + 0.15);
          gain.gain.setValueAtTime(0.5, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.35);
        } catch {}
      };

      beep();
      if (!synthIntervalRef.current) {
        synthIntervalRef.current = setInterval(beep, 600);
      }
    } catch {
      // AudioContext blocked
    }
  }, []);

  const playBuzzer = useCallback(() => {
    const authCtx = getPartnerOrShopkeeperContext();
    if (!authCtx.isAllowed) return; // Strict guard: Agents, riders, QC, operators never get sound

    if (!audioEnabled) return;
    const alarm = alarmRef.current;
    if (alarm) {
      alarm.currentTime = 0;
      alarm.loop = true;
      alarm.volume = 1.0;
      alarm.muted = false;
      alarm.play().catch(() => {
        playSyntheticBuzzer();
      });
    } else {
      playSyntheticBuzzer();
    }
  }, [audioEnabled, playSyntheticBuzzer]);

  // 3. Process an incoming alert
  const handleIncomingAlert = useCallback((data: any) => {
    const authCtx = getPartnerOrShopkeeperContext();
    if (!authCtx.isAllowed) return;

    const orderId = String(data.orderId || data.id || "");
    if (!orderId) return;

    if (dismissedAlertIdsRef.current.has(orderId)) return;
    if (seenAlertIdsRef.current.has(orderId)) return;

    seenAlertIdsRef.current.add(orderId);

    const timeoutSec = Number(data.timeoutSeconds || 120);
    const alertItem: UnassignedDeliveryAlertData = {
      orderId,
      orderNumber: data.orderNumber || data.order_number || orderId,
      warehouseId: data.warehouseId || data.warehouse_id,
      deliveryType: data.deliveryType || "FAST",
      totalAmount: Number(data.totalAmount || data.total_value || 0),
      status: data.status || "CONFIRMED",
      title: data.title || "Delivery Partner Not Assigned",
      message: data.message || `This order has not been accepted by any delivery partner within ${timeoutSec} seconds. Please check the order and arrange delivery.`,
      timeoutSeconds: timeoutSec,
      timestamp: data.timestamp || new Date().toISOString(),
    };

    setAlertQueue((prev) => {
      if (prev.some((a) => a.orderId === orderId)) return prev;
      return [...prev, alertItem];
    });
  }, []);

  // Promote next alert in queue to active and start buzzer
  useEffect(() => {
    if (!activeAlert && alertQueue.length > 0) {
      const next = alertQueue[0];
      setActiveAlert(next);
      setAlertQueue((prev) => prev.slice(1));
      playBuzzer();
    } else if (!activeAlert) {
      stopBuzzer();
    }
  }, [activeAlert, alertQueue, playBuzzer, stopBuzzer]);

  const dismissAlert = useCallback((orderId: string) => {
    dismissedAlertIdsRef.current.add(orderId);
    stopBuzzer();
    setActiveAlert((prev) => (prev?.orderId === orderId ? null : prev));
    setAlertQueue((prev) => prev.filter((a) => a.orderId !== orderId));
  }, [stopBuzzer]);

  // 4. Polling loop (Runs every 5 seconds for authorized partner/shopkeeper roles)
  useEffect(() => {
    let isMounted = true;
    let isPolling = false;

    const pollUnassignedAlerts = async () => {
      const authCtx = getPartnerOrShopkeeperContext();
      if (!authCtx.isAllowed) {
        setActiveAlert(null);
        setAlertQueue([]);
        return;
      }

      if (isPolling) return;
      isPolling = true;

      try {
        const storeId =
          authCtx.warehouseId ||
          (typeof localStorage !== "undefined" ? localStorage.getItem("partnerWarehouseId") : "") ||
          "";
        const endpoint = storeId ? `/orders/unassigned-alerts?store_id=${storeId}` : `/orders/unassigned-alerts`;
        const res = await api.get(endpoint).catch(() => null);

        if (!isMounted || !res?.data || !Array.isArray(res.data)) return;

        res.data.forEach((item: any) => {
          const id = String(item.orderId || item.id || "");
          if (id && !seenAlertIdsRef.current.has(id) && !dismissedAlertIdsRef.current.has(id)) {
            // New unassigned order found! Trigger alert with buzzer
            handleIncomingAlert(item);
          }
        });
      } catch (err) {
        // network or auth error
      } finally {
        isPolling = false;
      }
    };

    // Initial check immediately on mount/login
    pollUnassignedAlerts();

    // Poll every 5 seconds
    const intervalId = setInterval(pollUnassignedAlerts, 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [handleIncomingAlert]);

  // 5. Dual Socket.IO Listeners (Connected if role is partner or shopkeeper)
  useEffect(() => {
    const authCtx = getPartnerOrShopkeeperContext();
    if (!authCtx.isAllowed) return;

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

    const storeId =
      authCtx.warehouseId ||
      (typeof localStorage !== "undefined" ? localStorage.getItem("partnerWarehouseId") : "") ||
      "";

    // A. Connect to root namespace (scoped to store room)
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

    // B. Connect to /partner namespace
    const partnerSocket = io(`${SOCKET_URL}/partner`, {
      auth: { token },
      transports: ["websocket", "polling"],
    });
    partnerSocketRef.current = partnerSocket;

    partnerSocket.on("connect", () => {
      if (storeId) {
        partnerSocket.emit("join:store", { storeId });
      }
    });

    const unassignedEvents = [
      "order:unassigned_timeout",
      "partner:delivery_unassigned_timeout",
      "delivery_unassigned_timeout",
      "order:unassigned",
      "UNASSIGNED_TIMEOUT",
    ];

    unassignedEvents.forEach((ev) => {
      rootSocket.on(ev, (data: any) => {
        console.log(`[SOCKET:ROOT] Received ${ev}`, data);
        handleIncomingAlert(data);
      });
      partnerSocket.on(ev, (data: any) => {
        console.log(`[SOCKET:PARTNER] Received ${ev}`, data);
        handleIncomingAlert(data);
      });
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
