import { useState, useEffect } from "react";
import { X, Volume2, VolumeX, Bell, CheckCircle2, AlertCircle, ShieldAlert, Play, Sparkles } from "lucide-react";
import { requestFcmToken } from "../../utils/firebase";
import { toast } from "react-hot-toast";

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioEnabled: boolean;
  toggleAudio: () => void;
}

export function NotificationSettingsModal({
  isOpen,
  onClose,
  audioEnabled,
  toggleAudio,
}: NotificationSettingsModalProps) {
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default"
  );
  const [isTestingPush, setIsTestingPush] = useState(false);
  const [isPlayingTestSound, setIsPlayingTestSound] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPushPermission(Notification.permission);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestSound = () => {
    try {
      setIsPlayingTestSound(true);
      const testAudio = new Audio("/sounds/flutie8211-low-pitch-alarm-buzzer-451576.mp3");
      testAudio.volume = 1.0;
      testAudio
        .play()
        .then(() => {
          toast.success("Playing sample alarm audio!");
          setTimeout(() => {
            testAudio.pause();
            testAudio.currentTime = 0;
            setIsPlayingTestSound(false);
          }, 3000);
        })
        .catch((err) => {
          setIsPlayingTestSound(false);
          toast.error("Audio playback blocked: " + err.message);
        });
    } catch (e: any) {
      setIsPlayingTestSound(false);
      toast.error("Failed to play test sound");
    }
  };

  const handleEnablePush = async () => {
    setIsTestingPush(true);
    try {
      const token = await requestFcmToken();
      if (typeof window !== "undefined" && "Notification" in window) {
        setPushPermission(Notification.permission);
      }
      if (token) {
        toast.success("Desktop Push Notifications enabled!");
        // Display test OS notification
        if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification("🔔 TEST NOTIFICATION", {
              body: "Order #VK-TEST • ₹850 • Web Push active when browser is minimized!",
              icon: "/favicon.ico",
            });
          });
        }
      } else {
        toast.error("Could not obtain push token. Check browser permissions.");
      }
    } catch (e: any) {
      toast.error("Error setting up push notifications");
    } finally {
      setIsTestingPush(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-lg bg-gray-900 text-white rounded-3xl shadow-2xl border border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800 bg-gray-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-500 flex items-center justify-center">
              <Bell size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Notification Setup & Sound Settings</h3>
              <p className="text-xs text-gray-400">Manage real-time order alerts and push settings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Card 1: Alarm Audio Sound */}
          <div className="bg-gray-800/60 rounded-2xl p-5 border border-gray-700/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  audioEnabled ? "bg-emerald-500/20 text-emerald-400" : "bg-orange-500/20 text-orange-400"
                }`}>
                  {audioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Order Alarm Sound</p>
                  <p className="text-xs text-gray-400">
                    {audioEnabled ? "Sound Enabled (Rings on new orders)" : "Sound Muted"}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleAudio}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  audioEnabled
                    ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40"
                    : "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/40"
                }`}
              >
                {audioEnabled ? "Enabled" : "Disabled"}
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-700/40">
              <p className="text-xs text-gray-400">Test alarm audio volume on your speakers</p>
              <button
                onClick={handleTestSound}
                disabled={isPlayingTestSound}
                className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50"
              >
                <Play size={14} className={isPlayingTestSound ? "animate-spin" : ""} />
                {isPlayingTestSound ? "Playing..." : "Test Sound"}
              </button>
            </div>

            <div className="bg-gray-900/60 rounded-xl p-3 text-xs text-gray-400 border border-gray-800">
              💡 <span className="font-medium text-gray-300">Quick Tip:</span> Hold down (long press for 450ms) on the bottom-right sound widget anytime to turn sound on/off.
            </div>
          </div>

          {/* Card 2: Desktop Push Notifications (FCM + OS) */}
          <div className="bg-gray-800/60 rounded-2xl p-5 border border-gray-700/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  pushPermission === "granted"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : pushPermission === "denied"
                    ? "bg-rose-500/20 text-rose-400"
                    : "bg-amber-500/20 text-amber-400"
                }`}>
                  {pushPermission === "granted" ? (
                    <CheckCircle2 size={18} />
                  ) : pushPermission === "denied" ? (
                    <ShieldAlert size={18} />
                  ) : (
                    <AlertCircle size={18} />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Windows OS Push Notifications</p>
                  <p className="text-xs text-gray-400">
                    {pushPermission === "granted"
                      ? "Active — Receives alerts when browser is minimized"
                      : pushPermission === "denied"
                      ? "Blocked in browser settings"
                      : "Permission Required"}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              When the website is minimized, in another tab, or running in the background, Chrome Service Worker uses Firebase Push to show Windows OS notifications with order details.
            </p>

            <button
              onClick={handleEnablePush}
              disabled={isTestingPush}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all shadow-md disabled:opacity-50"
            >
              <Sparkles size={15} />
              {isTestingPush ? "Setting up..." : pushPermission === "granted" ? "Test OS Push Notification" : "Enable Background OS Notifications"}
            </button>
          </div>

          {/* Card 3: Auto-Confirm Info */}
          <div className="bg-gray-800/40 rounded-2xl p-4 border border-gray-800 text-xs text-gray-400 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-300">Auto-Confirm Timer</p>
              <p className="text-[11px] text-gray-500">Unanswered orders auto-confirm after 30 seconds</p>
            </div>
            <span className="font-mono text-orange-400 font-bold bg-orange-500/10 px-2.5 py-1 rounded-lg border border-orange-500/20">
              30s
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 bg-gray-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
