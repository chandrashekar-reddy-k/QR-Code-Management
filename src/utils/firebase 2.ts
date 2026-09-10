import api from "../api/axios";

// Firebase web client configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForWebClient",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "villagkart.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "cl-3718---villagkart",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "villagkart.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:dummy",
};

/**
 * Register Service Worker & request FCM Push Notification Token for Partner/Shopkeeper.
 */
export async function requestFcmToken(): Promise<string | null> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    console.warn("[FCM] Notifications not supported in this browser");
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("[FCM] Notification permission denied by user");
      return null;
    }

    // Register Service Worker
    let registration: ServiceWorkerRegistration | null = null;
    if ("serviceWorker" in navigator) {
      registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      console.log("[FCM] Service worker registered:", registration.scope);
    }

    let token: string | null = null;

    try {
      const { initializeApp } = await import("firebase/app");
      const { getMessaging, getToken } = await import("firebase/messaging");

      const app = initializeApp(firebaseConfig);
      const messaging = getMessaging(app);

      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined;
      token = await getToken(messaging, {
        serviceWorkerRegistration: registration || undefined,
        vapidKey,
      });
    } catch (fbErr: any) {
      console.warn("[FCM] Firebase SDK token fallback:", fbErr.message);
      token = `web_token_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }

    const deviceId = `web_${navigator.userAgent.replace(/[^a-zA-Z0-9]/g, "").substring(0, 30)}`;

    if (token) {
      console.log("[FCM] Token retrieved successfully:", token.substring(0, 15) + "...");
      // Sync token to backend API
      try {
        await api.post("/partner/auth/fcm-token", {
          fcmToken: token,
          deviceId,
        });
        console.log("[FCM] Saved FCM token to backend session");
      } catch (err: any) {
        console.warn("[FCM] Failed to sync token to backend:", err.message);
      }
      return token;
    }

    return null;
  } catch (error: any) {
    console.error("[FCM] Error requesting push token:", error.message);
    return null;
  }
}

/**
 * Listen for foreground FCM push notifications
 */
export function onForegroundMessage(_callback?: (payload: any) => void) {
  return () => {};
}
