import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { 
  MapPin, Package, Wallet, Clock, BarChart2, User, Activity, 
  FileText, Truck, AlertTriangle, Receipt, LogOut, Menu, X, Store,
  ArrowDownToLine, ArrowUpFromLine
} from 'lucide-react';
import { useUserStore } from '../store/userStore';

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
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (token) {
      refreshUserProfile();
    }
    // Force light theme for agent portal
    const root = window.document.documentElement;
    root.classList.remove('dark');
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('isAuthenticated');
    navigate('/login');
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-white text-gray-800">
      {/* Sidebar Header */}
      <div className="p-6 border-b border-gray-100 flex-shrink-0 flex items-center justify-between">
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

      {/* Nav Items */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {menuSections.map((section) => (
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
      <div className="p-4 border-t border-gray-100 bg-slate-50/50/50 flex-shrink-0">
        <div className="mx-2 p-3 rounded-2xl bg-white border border-gray-100 dark:border-gray-600 shadow-sm flex items-center gap-3">
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
      <aside className="hidden md:block w-72 border-r border-gray-200 dark:border-gray-800 h-screen fixed left-0 top-0 flex-shrink-0 z-40 bg-white">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer (Collapsible) */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white transform transition-transform duration-300 md:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
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
