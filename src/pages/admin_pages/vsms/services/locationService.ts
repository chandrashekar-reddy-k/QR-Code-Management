// @ts-nocheck
import api from './api';

const PENDING_LOGS_KEY = 'vk_pending_location_logs';

/**
 * Log current location to server
 */
export const logLocation = async (data) => {
  try {
    const token = localStorage.getItem('partnerToken') || localStorage.getItem('token') || localStorage.getItem('authToken');
    if (!token) {
        console.warn('[Location] No token found, skipping log.');
        return { status: 'unauthorized' };
    }

    if (!navigator.onLine) {
      queueLog(data);
      return { status: 'queued' };
    }
    return await api.post(`/location/log`, data);
  } catch (error) {
    queueLog(data);
    return { status: 'queued' };
  }
};

/**
 * Queue log in localStorage when offline
 */
const queueLog = (data) => {
  const pending = JSON.parse(localStorage.getItem(PENDING_LOGS_KEY) || '[]');
  pending.push({ ...data, timestamp: new Date().toISOString() });
  localStorage.setItem(PENDING_LOGS_KEY, JSON.stringify(pending));
};

/**
 * Sync pending logs from localStorage
 */
export const syncPendingLogs = async () => {
  const pending = JSON.parse(localStorage.getItem(PENDING_LOGS_KEY) || '[]');
  if (pending.length === 0) return;

  const successfulSyncs = [];

  for (const log of pending) {
    try {
      await api.post(`/location/log`, log);
      successfulSyncs.push(log);
    } catch (error) {
      console.error('Failed to sync log:', error);
      break; 
    }
  }

  const remaining = pending.filter(p => !successfulSyncs.includes(p));
  localStorage.setItem(PENDING_LOGS_KEY, JSON.stringify(remaining));
};

/**
 * Start periodic location tracking
 */
const TRACKING_DISABLED_KEY = 'vk_live_tracking_disabled';
let trackingInterval = null;
let watchId = null;

export const startLiveTracking = (intervalMs = 10000) => {
  if (localStorage.getItem(TRACKING_DISABLED_KEY) === 'true') {
    return;
  }
  if (trackingInterval || watchId) return;

  const captureLocation = () => {
    if (!navigator.geolocation) return;

    // Fast attempt without waiting for hardware GPS lock
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        logLocation({ lat: latitude, lon: longitude, accuracy: accuracy || 20 });
      },
      (error) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude, accuracy } = pos.coords;
            logLocation({ lat: latitude, lon: longitude, accuracy: accuracy || 50 });
          },
          () => {},
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 }
    );
  };

  // Immediate capture on start
  captureLocation();

  if (navigator.geolocation) {
    try {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          logLocation({ lat: latitude, lon: longitude, accuracy: accuracy || 20 });
        },
        () => {},
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
      );
    } catch (_) {}
  }
  
  trackingInterval = setInterval(() => {
    captureLocation();
    syncPendingLogs();
  }, intervalMs);
};

export const stopLiveTracking = async () => {
  localStorage.setItem(TRACKING_DISABLED_KEY, 'true');
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }
  if (watchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  // Sync offline status to database immediately via both paths
  await Promise.all([
    api.put('/location/status', { isOnline: false }).catch(() => {}),
    api.put('/agent/auth/status', { isOnline: false }).catch(() => {})
  ]);
};

export const enableLiveTracking = () => {
  localStorage.removeItem(TRACKING_DISABLED_KEY);
  // Sync online status to database immediately via both paths
  api.put('/location/status', { isOnline: true }).catch(() => {});
  api.put('/agent/auth/status', { isOnline: true }).catch(() => {});
  startLiveTracking();
};

export const isTrackingActive = () => {
  return trackingInterval !== null && localStorage.getItem(TRACKING_DISABLED_KEY) !== 'true';
};

/**
 * Admin: Get latest locations for all active agents
 */
export const getLiveLocations = async (storeId) => {
    const response = await api.get(`/location/live`, {
        params: { storeId }
    });
    return response.data;
};

/**
 * Admin: Get location history for a specific date/user
 */
export const getLocationHistory = async (params) => {
    const response = await api.get(`/location/history`, {
        params
    });
    return response.data;
};
