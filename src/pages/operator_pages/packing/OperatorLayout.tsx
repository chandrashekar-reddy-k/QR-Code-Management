import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ListTodo,
  Package,
  History,
  AlertCircle,
  UserCircle,
  Tag,
  MapPin,
  Sun,
  Moon,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { workOrderService } from '../../../api/packing/workOrderService';
import { getOperatorUser, operatorLogout } from './operatorAuth';

export interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

const operatorNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/packer/operator/dashboard' },
  { icon: ListTodo, label: 'My Jobs', path: '/packer/operator/jobs' },
  { icon: Package, label: 'Active Packing', path: '/packer/operator/active-packing' },
  { icon: Tag, label: 'Label Application', path: '/packer/operator/label-application' },
  { icon: History, label: 'Packing History', path: '/packer/operator/history' },
  { icon: AlertCircle, label: 'Report Issue', path: '/packer/operator/report-issue' },
  { icon: UserCircle, label: 'Profile', path: '/packer/operator/profile' },
];

export const OperatorLayout: React.FC = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [assignedJobsCount, setAssignedJobsCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const user = getOperatorUser();

  const isProfilePage = location.pathname.includes('/profile');

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    workOrderService.getWorkOrders()
      .then((res) => {
        const count = res.data ? res.data.length : 0;
        setAssignedJobsCount(count);
      })
      .catch((err) => console.error('Failed to fetch assigned jobs count:', err));
  }, []);

  const handleLogout = () => {
    operatorLogout();
    navigate('/login');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getShift = () => {
    const hour = new Date().getHours();
    return hour < 15 ? 'Morning' : 'Evening';
  };

  const bottomNavItems = [
    { icon: LayoutDashboard, label: 'Home', path: '/packer/operator/dashboard' },
    { icon: ListTodo, label: 'Jobs', path: '/packer/operator/jobs' },
    { icon: Package, label: 'Active', path: '/packer/operator/active-packing' },
    { icon: Tag, label: 'Labels', path: '/packer/operator/label-application' },
    { icon: History, label: 'History', path: '/packer/operator/history' },
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-gray-900 font-sans w-full overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 w-64 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] shrink-0">
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center text-white font-black text-xl shadow-md">
              V
            </div>
            <div>
              <span className="font-bold text-lg text-gray-800 dark:text-white tracking-tight">VillagKart</span>
              <span className="block text-[10px] font-bold text-green-600 uppercase tracking-widest leading-none">Packer Portal</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
          {operatorNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/packer/operator/dashboard' && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center p-3 rounded-xl transition-all group relative overflow-hidden font-medium text-sm ${
                  isActive
                    ? 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 font-bold'
                    : 'text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700/50 hover:text-green-600'
                }`}
              >
                <div className={`flex items-center justify-center shrink-0 mr-3 ${isActive ? 'text-green-600 dark:text-green-400' : 'text-slate-400 group-hover:text-green-500'}`}>
                  <Icon size={20} />
                </div>
                <span>{item.label}</span>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-green-500 rounded-r-full" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-gray-700 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center p-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors font-semibold text-sm"
          >
            <LogOut size={20} className="mr-3 text-red-400" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)}>
          <div
            className="w-72 bg-white dark:bg-gray-800 h-full flex flex-col p-4 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-3">
              <span className="font-bold text-gray-800 dark:text-white">Operator Menu</span>
              <button onClick={() => setSidebarOpen(false)} className="p-1 text-gray-500">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 space-y-2 overflow-y-auto">
              {operatorNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center p-3 rounded-xl text-sm font-semibold ${
                      isActive ? 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Icon size={20} className="mr-3" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <button
              onClick={handleLogout}
              className="w-full flex items-center p-3 text-red-500 font-semibold text-sm border-t border-gray-100 dark:border-gray-700"
            >
              <LogOut size={20} className="mr-3" /> Logout
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 relative overflow-hidden">
        {/* Header (Green Header for Operator) */}
        {!isProfilePage && (
          <>
            {/* Desktop Green Header */}
            <header className="hidden md:flex bg-green-600 text-white px-6 h-20 justify-between items-center shadow-md z-10 shrink-0">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-xl font-bold leading-tight">{getGreeting()}, {user.name.split(' ')[0]} 👋</p>
                </div>
                <div className="h-8 w-px bg-green-500 mx-2"></div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold leading-none">Packing Operator</span>
                  <span className="text-xs opacity-90 flex items-center gap-1 leading-none mt-1">
                    <MapPin size={12} /> {user.warehouse?.name || 'Hyderabad Warehouse'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  className="p-2 hover:bg-green-700 rounded-lg transition-colors relative"
                  onClick={() => setDarkMode(!darkMode)}
                  title="Toggle Theme"
                >
                  {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
              </div>
            </header>

            {/* Mobile Header */}
            <header className="md:hidden bg-green-600 text-white px-4 py-4 shadow-md z-10 shrink-0 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <button onClick={() => setSidebarOpen(true)} className="p-1 hover:bg-green-700 rounded-lg">
                  <Menu size={24} />
                </button>
                <button
                  className="p-1 hover:bg-green-700 rounded-lg transition-colors"
                  onClick={() => setDarkMode(!darkMode)}
                >
                  {darkMode ? <Sun size={22} /> : <Moon size={22} />}
                </button>
              </div>

              <div>
                <h1 className="text-2xl font-bold">{getGreeting()}, {user.name.split(' ')[0]} 👋</h1>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold opacity-95">Packing Operator</span>
                <span className="text-xs opacity-80 flex items-center gap-1">
                  <MapPin size={12} /> {user.warehouse?.name || 'Hyderabad Warehouse'}
                </span>
              </div>

              <div className="mt-1 bg-green-700/50 rounded-xl p-2.5 flex items-center justify-center text-[11px] font-medium opacity-90 text-center">
                🟢 Shift: {getShift()} &bull; Ready for Packing &bull; {assignedJobsCount} Assigned Jobs
              </div>
            </header>
          </>
        )}

        {/* View Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 scroll-smooth bg-slate-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 w-full bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-around items-center h-16 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-30 shrink-0">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/packer/operator/dashboard' && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                  isActive ? 'text-green-600 font-bold' : 'text-gray-500 dark:text-gray-400 hover:text-green-500'
                }`}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium text-center leading-tight">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default OperatorLayout;
