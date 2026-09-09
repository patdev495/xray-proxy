import React from 'react';
import { 
  ShieldCheck, 
  LayoutDashboard, 
  Server, 
  Users, 
  RefreshCw, 
  LogOut, 
  Package,
  Receipt,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../context/AuthContext';

export type NavTabId = 'overview' | 'nodes' | 'subscriptions' | 'plans' | 'orders' | 'sync';

interface NavItem {
  id: NavTabId;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  accentColor: string;
}

interface SidebarProps {
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { user, logout } = useAuth();

  const navItems: NavItem[] = [
    {
      id: 'overview',
      label: 'System Overview',
      icon: <LayoutDashboard className="w-4 h-4" />,
      accentColor: 'text-indigo-500',
    },
    {
      id: 'nodes',
      label: 'Nodes & SNI Profiles',
      icon: <Server className="w-4 h-4" />,
      badge: 'Issue 03',
      accentColor: 'text-cyan-500',
    },
    {
      id: 'subscriptions',
      label: 'Customer Subscriptions',
      icon: <Users className="w-4 h-4" />,
      badge: 'Issue 04',
      accentColor: 'text-blue-500',
    },
    {
      id: 'plans',
      label: 'Plans & Settings',
      icon: <Package className="w-4 h-4" />,
      badge: 'Issue 02',
      accentColor: 'text-purple-500',
    },
    {
      id: 'orders',
      label: 'Orders & Billing',
      icon: <Receipt className="w-4 h-4" />,
      badge: 'SePay',
      accentColor: 'text-emerald-500',
    },
    {
      id: 'sync',
      label: 'Node Sync & Telemetry',
      icon: <RefreshCw className="w-4 h-4" />,
      accentColor: 'text-amber-500',
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white/80 backdrop-blur-2xl border-r border-slate-200/80 w-64 select-none shadow-xs">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100/90 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-tight text-slate-900">
                xray<span className="text-indigo-600">-proxy</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Control Plane</p>
          </div>
        </div>
        <Badge variant="cyan" size="sm">v0.1</Badge>
      </div>

      {/* Navigation List */}
      <div className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
          Management Console
        </div>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectTab(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 font-bold'
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={isActive ? 'text-white' : item.accentColor}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-slate-100/90 bg-slate-50/40">
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/90 border border-slate-200/80 shadow-xs backdrop-blur-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-pink-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              {user?.username?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">
                {user?.username || 'Administrator'}
              </p>
              <p className="text-[10px] text-indigo-600 font-bold uppercase font-mono tracking-wider">
                {user?.role || 'ADMIN'}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block shrink-0 h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 w-64 h-full animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
