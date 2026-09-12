import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { 
  Home, MapPin, Package, Wallet, Clock, BarChart2, User, Activity, 
  FileText, Truck, AlertTriangle, Receipt, LogOut, Menu, X, Store,
  ArrowDownToLine, ArrowUpFromLine, ShoppingBag, ShoppingCart, Hexagon
} from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { attendanceAPI } from '../services/api';
import PunchInScreen from './PunchInScreen';
import { openHRMSPortal } from '../../../../utils/hrmsSSO';
import * as locationService from '../services/locationService';

let hrmsWindowRef: Window | null = null;

const menuSections = [
  {
    title: 'Core Operations',
    items: [
      { path: '/vsms/agent-portal/home', label: 'Home Dashboard', icon: Home },
      { path: '/vsms/agent-portal/today-plan', label: "Today's Plan", icon: MapPin },
      { path: '/vsms/agent-portal/pre-orders', label: "Pre-Orders", icon: ShoppingBag },
      { path: '/vsms/agent-portal/scheduled-deliveries', label: "Scheduled Deliveries", icon: Package },
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
  const [trackingOn, setTrackingOn] = useState(() => locationService.isTrackingActive());
  const { user, refreshUserProfile } = useUserStore() as any;
  const [attendanceChecked, setAttendanceChecked] = useState(false);
  const [hasPunchedIn, setHasPunchedIn] = useState(false);
  const [checkingAttendance, setCheckingAttendance] = useState(true);

  const agentName = user?.name || localStorage.getItem('userName') || 'Agent';

  // Only gate agent roles
  const roleUpper = (user?.role || localStorage.getItem('role') || localStorage.getItem('partnerRole') || '').toUpperCase();
  const isAgent = roleUpper === 'SALES_AGENT' || roleUpper === 'VEHICLE_AGENT' || roleUpper === 'VSMS_AGENT' || roleUpper === 'DELIVERY_AGENT' || roleUpper.endsWith('_AGENT') || roleUpper === 'AGENT';

  useEffect(() => {
    // Check attendance for agent portal users
    const checkAttendance = async () => {
      if (!isAgent) {
        setAttendanceChecked(true);
        setHasPunchedIn(true);
        setCheckingAttendance(false);
        return;
      }
      try {
        const { data } = await attendanceAPI.getToday();
        setHasPunchedIn(data?.punchedIn === true);
      } catch (err) {
        console.error('Failed to check attendance in AgentPortalLayout:', err);
        setHasPunchedIn(false);
      } finally {
        setAttendanceChecked(true);
        setCheckingAttendance(false);
      }
    };
    checkAttendance();
  }, [isAgent]);

  useEffect(() => {
    // Fetch real user profile (assignedVehicleId, role, etc.) on mount
    const token = localStorage.getItem('partnerToken') || localStorage.getItem('token') || localStorage.getItem('authToken');
    if (token) {
      refreshUserProfile();
    }

    // Auto-start live tracking when agent portal is open
    locationService.startLiveTracking();

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
    window.addEventListener('pagehide', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await locationService.stopLiveTracking();
    } catch (err) {
      console.error('Failed to stop live tracking on logout:', err);
    }
    if (hrmsWindowRef && !hrmsWindowRef.closed) {
      try {
        hrmsWindowRef.close();
      } catch (err) {
        console.error('Failed to close HRMS window:', err);
      }
    }
    localStorage.removeItem('token');
    localStorage.removeItem('partnerToken');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('isAuthenticated');
    navigate('/login');
  };

  const hasAgentPermission = (path: string) => {
    if (!user) return false;

    // Agent roles always get full access to operations
    const agentRoles = ['VSMS_AGENT', 'SALES_AGENT', 'VEHICLE_AGENT', 'DELIVERY_AGENT', 'AGENT', 'FIELD_AGENT'];
    const currentRole = (user.role || localStorage.getItem('role') || localStorage.getItem('partnerRole') || '').trim().toUpperCase();
    if (agentRoles.includes(currentRole) || currentRole.endsWith('_AGENT') || currentRole === 'AGENT') return true;

    // Check user.permissions or flatPermissions
    let permissions = user.flatPermissions || user.permissions;
    if (!permissions || (Array.isArray(permissions) && permissions.length === 0) || (typeof permissions === 'object' && !Array.isArray(permissions) && Object.keys(permissions).length === 0)) {
      try {
        const permsStr = localStorage.getItem('permissions');
        if (permsStr) permissions = JSON.parse(permsStr);
      } catch {}
    }

    // If wildcard permissions, allow access to all paths
    if (Array.isArray(permissions) && (permissions.includes('*') || permissions.includes('ALL'))) {
      return true;
    }

    const slugMap: Record<string, string> = {
      '/vsms/agent-portal/today-plan': 'vsms_agent_todays_plan_view',
      '/vsms/agent-portal/pre-orders': 'vsms_agent_pre_orders_view',
      '/vsms/agent-portal/scheduled-deliveries': 'vsms_agent_scheduled_deliveries_view',
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

    if (Array.isArray(permissions)) {
      if (permissions.includes(slug)) return true;
      const hasAnyVsmsAgentPerm = permissions.some((p: string) => typeof p === 'string' && p.startsWith('vsms_agent_'));
      if (hasAnyVsmsAgentPerm) {
        return permissions.includes(slug);
      }
    }

    // Default to true for any agent portal user
    return true;
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
        {/* Location Tracking Toggle Widget */}
        <div className="mx-2 mb-3 p-3 rounded-2xl bg-slate-100 dark:bg-slate-850 border border-gray-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${trackingOn ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <div>
              <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-wider leading-none">
                Live Location
              </p>
              <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                {trackingOn ? 'Active (GPS ON)' : 'Disabled'}
              </p>
            </div>
          </div>
          <button
            onClick={async () => {
              if (locationService.isTrackingActive()) {
                await locationService.stopLiveTracking();
                setTrackingOn(false);
              } else {
                locationService.enableLiveTracking();
                setTrackingOn(true);
              }
            }}
            className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
              trackingOn
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                : 'bg-white text-slate-600 border-gray-300 hover:bg-slate-50'
            }`}
          >
            {trackingOn ? 'ON' : 'OFF'}
          </button>
        </div>

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

  const handlePunchIn = () => {
    setHasPunchedIn(true);
  };

  // Loading state while checking attendance
  if (checkingAttendance) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Checking Attendance...</p>
        </div>
      </div>
    );
  }

  // Gate agent portal with PunchInScreen until punched in
  if (isAgent && user?.attendanceEnabled !== false && attendanceChecked && !hasPunchedIn) {
    return <PunchInScreen onPunchIn={handlePunchIn} />;
  }

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
        {/* Header Bar (Desktop & Mobile Header with Live Location Toggle) */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30 flex-shrink-0">
          <div className="px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Mobile Sidebar Hamburger Trigger */}
              <button
                onClick={() => setIsOpen(true)}
                className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors border border-gray-200"
                aria-label="Open Navigation Menu"
              >
                <Menu size={18} />
              </button>

              {/* Modern iOS-Style Toggle Switch Component */}
              <div className="flex items-center gap-2 bg-slate-50 border border-gray-200 p-1 pl-2.5 rounded-full shadow-xs">
                <span className="text-[11px] sm:text-xs font-black tracking-tight text-slate-700 uppercase flex items-center gap-1.5 whitespace-nowrap">
                  <span className={`w-2 h-2 rounded-full ${trackingOn ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                  <span className="hidden sm:inline">Live Location:</span>
                  <span className={trackingOn ? 'text-emerald-700' : 'text-rose-600'}>
                    {trackingOn ? 'ON' : 'OFF'}
                  </span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={trackingOn}
                  onClick={async () => {
                    if (locationService.isTrackingActive()) {
                      await locationService.stopLiveTracking();
                      setTrackingOn(false);
                    } else {
                      locationService.enableLiveTracking();
                      setTrackingOn(true);
                    }
                  }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    trackingOn ? 'bg-emerald-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      trackingOn ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                className="flex items-center gap-1 px-2.5 py-1 sm:px-3.5 sm:py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg font-bold text-xs transition-all border border-green-200 cursor-pointer"
                title="Open HRMS Portal"
                onClick={() => openHRMSPortal()}
              >
                <span>HRMS</span>
              </button>
              <span className="hidden lg:inline text-xs font-black text-slate-700 uppercase tracking-wider">
                Welcome back, {agentName}
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-xs font-black">
                {agentName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 pb-24 md:pb-6">
          {children ?? <Outlet />}
        </main>

        {/* Mobile Bottom Navigation Bar (Figma Specs: Width 393px, Height 68px, Border-top 1px, Padding-top 8px, Padding-bottom 12px, BG #FFFFFF) */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FFFFFF] border-t border-gray-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] pb-safe">
          <div className="w-full max-w-[430px] h-[68px] mx-auto pt-2 pb-2 px-1 flex items-center justify-around">
            <NavLink
              to="/vsms/agent-portal/home"
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-1 transition-all ${
                  isActive
                    ? 'text-[#00891D]'
                    : 'text-gray-500 hover:text-gray-700'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Home size={22} strokeWidth={isActive ? 2.2 : 1.8} className={isActive ? 'text-[#00891D]' : 'text-gray-500'} />
                  <span className={`text-[10.5px] tracking-tight ${isActive ? 'font-bold text-[#00891D]' : 'font-medium text-gray-500'}`}>Home</span>
                </>
              )}
            </NavLink>

            <NavLink
              to="/vsms/agent-portal/inventory"
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-1 transition-all ${
                  isActive
                    ? 'text-[#00891D]'
                    : 'text-gray-500 hover:text-gray-700'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Truck size={22} strokeWidth={isActive ? 2.2 : 1.8} className={isActive ? 'text-[#00891D]' : 'text-gray-500'} />
                  <span className={`text-[10.5px] tracking-tight ${isActive ? 'font-bold text-[#00891D]' : 'font-medium text-gray-500'}`}>Vehicle & Stock</span>
                </>
              )}
            </NavLink>

            <NavLink
              to="/vsms/agent-portal/sales"
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-1 transition-all ${
                  isActive
                    ? 'text-[#00891D]'
                    : 'text-gray-500 hover:text-gray-700'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <ShoppingCart size={22} strokeWidth={isActive ? 2.2 : 1.8} className={isActive ? 'text-[#00891D]' : 'text-gray-500'} />
                  <span className={`text-[10.5px] tracking-tight ${isActive ? 'font-bold text-[#00891D]' : 'font-medium text-gray-500'}`}>Sales Grid</span>
                </>
              )}
            </NavLink>

            <NavLink
              to="/vsms/agent-portal/scheduled-deliveries"
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-1 transition-all ${
                  isActive
                    ? 'text-[#00891D]'
                    : 'text-gray-500 hover:text-gray-700'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Hexagon size={22} strokeWidth={isActive ? 2.2 : 1.8} className={isActive ? 'text-[#00891D]' : 'text-gray-500'} />
                  <span className={`text-[10.5px] tracking-tight ${isActive ? 'font-bold text-[#00891D]' : 'font-medium text-gray-500'}`}>Online Orders</span>
                </>
              )}
            </NavLink>

            <NavLink
              to="/vsms/agent-portal/profile"
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-1 transition-all ${
                  isActive
                    ? 'text-[#00891D]'
                    : 'text-gray-500 hover:text-gray-700'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <User size={22} strokeWidth={isActive ? 2.2 : 1.8} className={isActive ? 'text-[#00891D]' : 'text-gray-500'} />
                  <span className={`text-[10.5px] tracking-tight ${isActive ? 'font-bold text-[#00891D]' : 'font-medium text-gray-500'}`}>Profile</span>
                </>
              )}
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  );
}
