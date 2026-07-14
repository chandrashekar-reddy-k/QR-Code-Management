import { useState, useEffect } from 'react';
import {
  User, Bell, Shield, Store, Clock, Save,
  ChevronRight, Info, Check, Moon, Sun, Globe,
} from 'lucide-react';
import { getStoredUser } from './erpUtils';

interface SectionProps {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  title: string;
  description: string;
  color: string;
  children: React.ReactNode;
}

function SettingsSection({ icon: Icon, title, description, color, children }: SectionProps) {
  return (
    <div
      style={{
        background: '#fff', borderRadius: 16, border: '1px solid #F0F0F0',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: 20,
      }}
    >
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #F5F5F5', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: color + '18',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon size={18} color={color} />
        </div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>{title}</h3>
          <p style={{ fontSize: 12, color: '#AAA', margin: 0 }}>{description}</p>
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function SettingsRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: '14px 20px', borderBottom: '1px solid #F9F9F9',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      }}
    >
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#333', margin: 0 }}>{label}</p>
        {description && <p style={{ fontSize: 11, color: '#AAA', margin: 0, marginTop: 2 }}>{description}</p>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12,
        background: value ? '#00891D' : '#D0D0D0',
        border: 'none', cursor: 'pointer',
        position: 'relative', transition: 'background 0.25s',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          position: 'absolute', top: 3,
          left: value ? 23 : 3,
          transition: 'left 0.25s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  );
}

function SaveToast({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        background: '#1A1A1A', color: '#fff',
        borderRadius: 10, padding: '12px 18px',
        display: 'flex', alignItems: 'center', gap: 8,
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        animation: 'slideUp 0.3s ease',
      }}
    >
      <Check size={16} color="#A5D6A7" />
      <span style={{ fontSize: 13, fontWeight: 600 }}>Settings saved!</span>
    </div>
  );
}

export default function ERPSettings() {
  const user = getStoredUser();

  // Notification settings
  const [notifNewOrder, setNotifNewOrder] = useState(true);
  const [notifSLAAlert, setNotifSLAAlert] = useState(true);
  const [notifPickingReady, setNotifPickingReady] = useState(true);
  const [notifSound, setNotifSound] = useState(true);

  // Display settings
  const [darkMode, setDarkMode] = useState(false);
  const [compactView, setCompactView] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState('30');

  // SLA settings
  const [defaultSLA, setDefaultSLA] = useState('30');
  const [urgentThreshold, setUrgentThreshold] = useState('5');
  const [warnThreshold, setWarnThreshold] = useState('10');

  const [showToast, setShowToast] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('erp_settings');
      if (saved) {
        const s = JSON.parse(saved);
        if (s.notifNewOrder !== undefined) setNotifNewOrder(s.notifNewOrder);
        if (s.notifSLAAlert !== undefined) setNotifSLAAlert(s.notifSLAAlert);
        if (s.notifPickingReady !== undefined) setNotifPickingReady(s.notifPickingReady);
        if (s.notifSound !== undefined) setNotifSound(s.notifSound);
        if (s.darkMode !== undefined) setDarkMode(s.darkMode);
        if (s.compactView !== undefined) setCompactView(s.compactView);
        if (s.autoRefresh !== undefined) setAutoRefresh(s.autoRefresh);
        if (s.refreshInterval !== undefined) setRefreshInterval(s.refreshInterval);
        if (s.defaultSLA !== undefined) setDefaultSLA(s.defaultSLA);
        if (s.urgentThreshold !== undefined) setUrgentThreshold(s.urgentThreshold);
        if (s.warnThreshold !== undefined) setWarnThreshold(s.warnThreshold);
      }
    } catch {}
  }, []);

  const handleSave = () => {
    const settings = {
      notifNewOrder, notifSLAAlert, notifPickingReady, notifSound,
      darkMode, compactView, autoRefresh, refreshInterval,
      defaultSLA, urgentThreshold, warnThreshold,
    };
    localStorage.setItem('erp_settings', JSON.stringify(settings));
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  const name = user.name ?? 'Shopkeeper';
  const email = user.email ?? '—';
  const role = user.role ?? 'SHOPKEEPER';
  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>Settings</h1>
          <p style={{ fontSize: 13, color: '#999', margin: 0, marginTop: 2 }}>
            Manage your ERP preferences and notifications
          </p>
        </div>
        <button
          onClick={handleSave}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#00891D', color: '#fff',
            border: 'none', borderRadius: 10, padding: '9px 18px',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          <Save size={14} />
          Save Settings
        </button>
      </div>

      {/* Profile Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #00891D 0%, #00621A 100%)',
          borderRadius: 16, padding: '24px 24px',
          display: 'flex', alignItems: 'center', gap: 16,
          marginBottom: 20, boxShadow: '0 4px 16px rgba(0,137,29,0.2)',
        }}
      >
        <div
          style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 800, color: '#fff',
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>{name}</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: 0 }}>{email}</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0, marginTop: 2 }}>
            Role: {role}
          </p>
        </div>
        <button
          onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
          style={{
            marginLeft: 'auto', padding: '7px 14px', borderRadius: 8,
            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer',
          }}
        >
          Sign Out
        </button>
      </div>

      {/* Notifications */}
      <SettingsSection icon={Bell} title="Notifications" description="Manage alert preferences" color="#1565C0">
        <SettingsRow label="New Order Alert" description="Get notified when a new order arrives">
          <Toggle value={notifNewOrder} onChange={setNotifNewOrder} />
        </SettingsRow>
        <SettingsRow label="SLA Breach Alert" description="Get warned before SLA is breached">
          <Toggle value={notifSLAAlert} onChange={setNotifSLAAlert} />
        </SettingsRow>
        <SettingsRow label="Picking Ready Alert" description="Notify when picking is complete">
          <Toggle value={notifPickingReady} onChange={setNotifPickingReady} />
        </SettingsRow>
        <SettingsRow label="Sound Alerts" description="Play a sound on new notifications">
          <Toggle value={notifSound} onChange={setNotifSound} />
        </SettingsRow>
      </SettingsSection>

      {/* Display */}
      <SettingsSection icon={Globe} title="Display" description="Customize your ERP view" color="#6A1B9A">
        <SettingsRow label="Compact View" description="Reduce card and row padding">
          <Toggle value={compactView} onChange={setCompactView} />
        </SettingsRow>
        <SettingsRow label="Auto Refresh" description="Automatically refresh order data">
          <Toggle value={autoRefresh} onChange={setAutoRefresh} />
        </SettingsRow>
        {autoRefresh && (
          <SettingsRow label="Refresh Interval" description="How often to auto-refresh (seconds)">
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(e.target.value)}
              style={{
                border: '1px solid #E0E0E0', borderRadius: 6,
                padding: '5px 10px', fontSize: 13, color: '#333',
                background: '#fff', cursor: 'pointer',
              }}
            >
              <option value="15">15s</option>
              <option value="30">30s</option>
              <option value="60">1 min</option>
              <option value="120">2 min</option>
              <option value="300">5 min</option>
            </select>
          </SettingsRow>
        )}
      </SettingsSection>

      {/* SLA Config */}
      <SettingsSection icon={Clock} title="SLA Configuration" description="Set service level agreement thresholds" color="#E65100">
        <SettingsRow label="Default SLA Time" description="Default SLA in minutes for new orders">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="number"
              value={defaultSLA}
              onChange={(e) => setDefaultSLA(e.target.value)}
              min="5" max="120"
              style={{
                width: 64, border: '1px solid #E0E0E0', borderRadius: 6,
                padding: '5px 8px', fontSize: 13, color: '#333', textAlign: 'center',
              }}
            />
            <span style={{ fontSize: 12, color: '#AAA' }}>min</span>
          </div>
        </SettingsRow>
        <SettingsRow label="Urgent Alert Threshold" description="Alert when this many minutes remain">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="number"
              value={urgentThreshold}
              onChange={(e) => setUrgentThreshold(e.target.value)}
              min="1" max="30"
              style={{
                width: 64, border: '1px solid #E0E0E0', borderRadius: 6,
                padding: '5px 8px', fontSize: 13, color: '#333', textAlign: 'center',
              }}
            />
            <span style={{ fontSize: 12, color: '#AAA' }}>min</span>
          </div>
        </SettingsRow>
        <SettingsRow label="Warning Threshold" description="Show warning color when this many minutes remain">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="number"
              value={warnThreshold}
              onChange={(e) => setWarnThreshold(e.target.value)}
              min="1" max="60"
              style={{
                width: 64, border: '1px solid #E0E0E0', borderRadius: 6,
                padding: '5px 8px', fontSize: 13, color: '#333', textAlign: 'center',
              }}
            />
            <span style={{ fontSize: 12, color: '#AAA' }}>min</span>
          </div>
        </SettingsRow>
      </SettingsSection>

      {/* Security info */}
      <SettingsSection icon={Shield} title="Security" description="Account and session info" color="#C62828">
        <SettingsRow label="Session" description="You are logged in as a Shopkeeper">
          <span style={{ fontSize: 12, color: '#00891D', fontWeight: 600 }}>Active ●</span>
        </SettingsRow>
        <SettingsRow label="Change Password">
          <button
            style={{
              padding: '5px 12px', borderRadius: 6,
              border: '1px solid #E0E0E0', background: '#F9F9F9',
              color: '#555', fontWeight: 600, fontSize: 12, cursor: 'pointer',
            }}
          >
            Update →
          </button>
        </SettingsRow>
      </SettingsSection>

      {/* Info */}
      <div
        style={{
          background: '#EBF5FF', border: '1px solid #90CAF9', borderRadius: 12,
          padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start',
          marginBottom: 32,
        }}
      >
        <Info size={16} color="#1565C0" style={{ marginTop: 1, flexShrink: 0 }} />
        <p style={{ fontSize: 12, color: '#1565C0', margin: 0, lineHeight: 1.6 }}>
          Settings are saved locally in your browser. Clearing browser data will reset preferences to defaults.
        </p>
      </div>

      <SaveToast show={showToast} />

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
