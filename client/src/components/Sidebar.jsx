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
  Activity 
} from 'lucide-react';

export default function Sidebar() {
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

  function analyticsItemRequiredPermission() {
    return hasPermission('analytics');
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-darkbg-sidebar border-r border-white/5 flex flex-col h-screen fixed top-0 left-0 z-30">
      {/* Brand Header */}
      <div className="p-6 border-b border-white/5 flex items-center gap-3">
        <div className="bg-brand-orange/10 p-2.5 rounded-xl border border-brand-orange/35 animate-pulse">
          <Activity className="h-6 w-6 text-brand-orange" />
        </div>
        <div>
          <h1 className="font-extrabold text-xl tracking-wide font-sans text-white">TransitOps</h1>
          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-widest mt-0.5">Fleet Logistics ERP</p>
        </div>
      </div>

      {/* Nav Menu Items */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          // If permission is not met, do not render item
          if (item.permission && !hasPermission(item.permission)) return null;

          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group
                ${isActive 
                  ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/15 font-semibold' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5'
                }
              `}
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`h-5 w-5 transition-transform duration-200 group-hover:scale-105 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-brand-orange'}`} />
                  {item.name}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Session Profile & LogOut */}
      <div className="p-4 border-t border-white/5 bg-black/10">
        <div className="flex items-center gap-3 p-2 bg-white/5 rounded-xl border border-white/5">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-tr from-brand-orange to-amber-500 flex items-center justify-center font-bold text-white shadow-md shadow-brand-orange/10 text-sm">
            {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 font-medium truncate capitalize">{user?.role}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full mt-3 flex items-center justify-center gap-2.5 px-4 py-3 text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-xl text-sm font-semibold transition-all duration-200"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
