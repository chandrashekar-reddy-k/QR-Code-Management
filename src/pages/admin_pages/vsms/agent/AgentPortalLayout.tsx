import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { 
  MapPin, Package, Wallet, Clock, BarChart2, User, Activity, 
  FileText, Truck, AlertTriangle, Receipt, LogOut, Menu, X, Store,
  ArrowDownToLine, ArrowUpFromLine
} from 'lucide-react';
import { useUserStore } from '../store/userStore';

let hrmsWindowRef: Window | null = null;

const menuSections = [
  {
    title: 'Core Operations',
    items: [
      { path: '/vsms/agent-portal/today-plan', label: "Today's Plan", icon: MapPin },
      { path: '/vsms/agent-portal/sales', label: "Sales POS", icon: BarChart2 },
      { path: '/vsms/agent-portal/inventory', label: "Vehicle & Stock", icon: Truck },
    ]
  },
  {
    title: 'Finance & Wallet',
    items: [
      { path: '/vsms/agent-portal/opening-cash', label: "Opening Cash", icon: ArrowDownToLine },
      { path: '/vsms/agent-portal/closing-cash', label: "Closing Cash", icon: ArrowUpFromLine },
      { path: '/vsms/agent-portal/wallet', label: "Cash Wallet", icon: Wallet },
      { path: '/vsms/agent-portal/create-expense', label: "Create Expense", icon: Receipt },
    ]
  },
  {
    title: 'Performance & History',
    items: [
      { path: '/vsms/agent-portal/attendance', label: "My Attendance", icon: Clock },
      { path: '/vsms/agent-portal/reports', label: "Sales Analytics", icon: Activity },
      { path: '/vsms/agent-portal/sales-history', label: "Sales History", icon: Receipt },
      { path: '/vsms/agent-portal/targets', label: "My Targets", icon: BarChart2 },
    ]
  },
  {
    title: 'Assets & Reports',
    items: [
      { path: '/vsms/agent-portal/assets', label: "My Assets", icon: Package },
      { path: '/vsms/agent-portal/report-damage', label: "Report Damage", icon: AlertTriangle },
      { path: '/vsms/agent-portal/activity-logs', label: "Activity Logs", icon: FileText },
      { path: '/vsms/agent-portal/profile', label: "My Profile", icon: User },
    ]
  }
];

interface AgentPortalLayoutProps {
  children?: React.ReactNode;
}

export default function AgentPortalLayout({ children }: AgentPortalLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { user, refreshUserProfile } = useUserStore() as any;
  const agentName = user?.name || localStorage.getItem('userName') || 'Agent';

  useEffect(() => {
    // Fetch real user profile (assignedVehicleId, role, etc.) on mount
    const token = localStorage.getItem('partnerToken') || localStorage.getItem('token') || localStorage.getItem('authToken');
    if (token) {
      refreshUserProfile();
    }
    // Force light theme for agent portal
    const root = window.document.documentElement;
    root.classList.remove('dark');

    // Auto-close HRMS tab when agent portal tab is closed/unloaded
    const handleUnload = () => {
      if (hrmsWindowRef && !hrmsWindowRef.closed) {
        try {
          hrmsWindowRef.close();
        } catch (err) {}
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('unload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, []);

  const handleLogout = () => {
    if (hrmsWindowRef && !hrmsWindowRef.closed) {
      try {
        hrmsWindowRef.close();
      } catch (err) {
        console.error('Failed to close HRMS window:', err);
      }
    }
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('isAuthenticated');
    navigate('/login');
  };

  const hasAgentPermission = (path: string) => {
    if (!user) return false;

    // Agent roles always get full access — they are not subject to fine-grained permission gates
    const agentRoles = ['SALES_AGENT', 'VEHICLE_AGENT', 'DELIVERY_AGENT'];
    if (agentRoles.includes(user.role)) return true;

    // Check user.permissions from the store
    const permissions = user.permissions || [];

    // If wildcard permissions, allow access to all paths
    if (Array.isArray(permissions) && (permissions.includes('*') || permissions.includes('ALL'))) {
      return true;
    }

    const slugMap: Record<string, string> = {
      '/vsms/agent-portal/today-plan': 'vsms_agent_todays_plan_view',
      '/vsms/agent-portal/sales': 'vsms_agent_sales_pos_view',
      '/vsms/agent-portal/inventory': 'vsms_agent_vehicle_stock_view',
      '/vsms/agent-portal/opening-cash': 'vsms_agent_opening_cash_view',
      '/vsms/agent-portal/closing-cash': 'vsms_agent_closing_cash_view',
      '/vsms/agent-portal/wallet': 'vsms_agent_cash_wallet_view',
      '/vsms/agent-portal/create-expense': 'vsms_agent_create_expense_view',
      '/vsms/agent-portal/attendance': 'vsms_agent_my_attendance_view',
      '/vsms/agent-portal/reports': 'vsms_agent_sales_analytics_view',
      '/vsms/agent-portal/sales-history': 'vsms_agent_sales_history_view',
      '/vsms/agent-portal/targets': 'vsms_agent_my_targets_view',
      '/vsms/agent-portal/assets': 'vsms_agent_my_assets_view',
      '/vsms/agent-portal/report-damage': 'vsms_agent_report_damage_view',
      '/vsms/agent-portal/activity-logs': 'vsms_agent_activity_logs_view',
      '/vsms/agent-portal/profile': 'vsms_agent_my_profile_view',
    };

    const slug = slugMap[path];
    if (!slug) return true;
    return Array.isArray(permissions) && permissions.includes(slug);
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100">
      {/* Sidebar Header */}
      <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex-shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200 dark:shadow-none">
            <Store size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Agent Portal
            </h1>
            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mt-0.5">
              Operations
            </p>
          </div>
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          className="md:hidden p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-8">
        {menuSections
          .map((section) => {
            const filteredItems = section.items.filter((item) => hasAgentPermission(item.path));
            return { ...section, items: filteredItems };
          })
          .filter((section) => section.items.length > 0)
          .map((section) => (
            <div key={section.title} className="space-y-1">
              <p className="px-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                {section.title}
              </p>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group text-xs font-bold uppercase tracking-wider ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 dark:shadow-none'
                        : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-gray-750 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon size={16} strokeWidth={isActive ? 3 : 2.5} className={isActive ? 'text-white' : 'text-emerald-500'} />
                    <span className="flex-grow">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex-shrink-0">
        <div className="mx-2 p-3 rounded-2xl bg-white dark:bg-slate-950 border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 font-black text-sm border border-emerald-100 dark:border-emerald-900/30 shrink-0">
            {agentName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-black text-slate-900 dark:text-white truncate tracking-tight uppercase leading-none">
              {agentName}
            </p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate mt-1">
              Field Agent
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-5 py-2.5 mt-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 transition-all border border-transparent hover:border-rose-100 dark:hover:border-rose-900/30"
        >
          <LogOut size={14} strokeWidth={3} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex flex-col md:flex-row relative overflow-x-hidden">
      {/* Desktop Sidebar (Fixed on Left) */}
      <aside className="hidden md:block w-72 border-r border-gray-200 dark:border-gray-800 h-screen fixed left-0 top-0 flex-shrink-0 z-40 bg-white dark:bg-slate-900">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer (Collapsible) */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 transform transition-transform duration-300 md:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {renderSidebarContent()}
      </aside>

      {/* Main Content Area (Header + Main Page Content) */}
      <div className="flex-1 min-w-0 flex flex-col md:ml-72 min-h-screen">
        {/* Header Bar */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30 flex-shrink-0">
          <div className="px-4 py-3 flex items-center justify-between md:justify-end">
            <button
              onClick={() => setIsOpen(true)}
              className="md:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-3">
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg font-bold text-xs transition-all border border-green-200"
                title="Open HRMS Portal"
                onClick={async () => {
                  const token = localStorage.getItem('token');
                  const hrmsUrl = import.meta.env.VITE_HRMS_URL || "http://localhost:8088";
                  const baseUrl = (import.meta.env.VITE_IDENTITY_SERVICE_URL || "http://localhost:4000").replace(/\/+$/, '');
                  const identityUrl = `${baseUrl}/api/v1/auth/sso/ticket`;
                  if (token) {
                    try {
                      const response = await fetch(identityUrl, {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        }
                      });
                      const body = await response.json();
                      if (response.ok && body?.data?.ticket) {
                        hrmsWindowRef = window.open(`${hrmsUrl}/?sso_ticket=${body.data.ticket}`, '_blank');
                        return;
                      }
                    } catch (err) {
                      console.error('Failed to generate SSO ticket:', err);
                    }
                    hrmsWindowRef = window.open(`${hrmsUrl}/`, '_blank');
                  } else {
                    hrmsWindowRef = window.open(`${hrmsUrl}/`, '_blank');
                  }
                }}
              >
                <span>HRMS</span>
              </button>
              <span className="hidden sm:inline text-xs font-black text-slate-700 uppercase tracking-wider">
                Welcome back, {agentName}
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-xs font-black">
                {agentName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-y-auto">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
