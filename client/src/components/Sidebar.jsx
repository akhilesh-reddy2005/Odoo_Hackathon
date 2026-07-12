import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard,
  Truck,
  Users,
  Milestone,
  Wrench,
  Fuel,
  BarChart3,
  Settings,
  LogOut,
  Activity,
  X
} from 'lucide-react';

export default function Sidebar({ mobileOpen = false, onClose = () => {} }) {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, permission: 'dashboard' },
    { name: 'Fleet', path: '/fleet', icon: Truck, permission: 'fleet' },
    { name: 'Drivers', path: '/drivers', icon: Users, permission: 'drivers' },
    { name: 'Trips', path: '/trips', icon: Milestone, permission: 'trips' },
    { name: 'Maintenance', path: '/maintenance', icon: Wrench, permission: 'maintenance' },
    { name: 'Fuel & Expenses', path: '/fuel-expenses', icon: Fuel, permission: 'fuel' },
    { name: 'Analytics', path: '/analytics', icon: BarChart3, permission: 'analytics' },
    { name: 'Settings', path: '/settings', icon: Settings, permission: 'settings' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile scrim */}
      {mobileOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 z-40 lg:hidden"
        />
      )}

      <aside
        className={`w-64 bg-surface border-r border-line flex flex-col h-screen fixed top-0 left-0 z-50 transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-brand/10 p-2 rounded-lg border border-brand/20 shrink-0">
              <Activity className="h-5 w-5 text-brand" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-base tracking-tight text-ink-primary truncate">TransitOps</h1>
              <p className="text-[10px] text-ink-muted font-medium uppercase tracking-widest mt-0.5">Fleet Logistics ERP</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-ink-muted hover:text-ink-primary lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav Menu Items */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {menuItems.map((item) => {
            // If permission is not met, do not render item
            if (item.permission && !hasPermission(item.permission)) return null;

            return (
              <NavLink
                key={item.name}
                to={item.path}
                end={item.path === '/'}
                onClick={onClose}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 group
                  ${isActive
                    ? 'bg-brand-light text-brand font-semibold'
                    : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-hover'
                  }
                `}
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={`h-[18px] w-[18px] ${isActive ? 'text-brand' : 'text-ink-muted group-hover:text-ink-secondary'}`} />
                    {item.name}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Session Profile & LogOut */}
        <div className="p-3 border-t border-line">
          <div className="flex items-center gap-3 p-2 rounded-lg">
            <div className="h-9 w-9 rounded-lg bg-brand flex items-center justify-center font-semibold text-white text-xs shrink-0">
              {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink-primary truncate">{user?.name}</p>
              <p className="text-xs text-ink-muted truncate capitalize">{user?.role}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full mt-1 flex items-center gap-3 px-3 py-2.5 text-ink-secondary hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg text-sm font-medium transition-colors duration-150"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
