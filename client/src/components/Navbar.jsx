import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Bell, Search, Clock, ShieldAlert, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { analyticsService } from '../services/api';

export default function Navbar() {
  const { user } = useAuth();
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Notification states
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  // Map route path to human-readable page name
  const pageTitles = {
    '/': 'Operations Dashboard',
    '/fleet': 'Fleet Infrastructure Management',
    '/drivers': 'Driver Credentials & Safety Registry',
    '/trips': 'Active Trip Lifecycles & Dispatch',
    '/maintenance': 'Vehicle Repair & Maintenance Workshops',
    '/fuel-expenses': 'Fuel Consumptions & Expense Ledgers',
    '/analytics': 'Financial Performance & Operations Insights',
    '/settings': 'System Settings & Permission Matrices'
  };

  const getPageTitle = () => {
    return pageTitles[location.pathname] || 'TransitOps ERP';
  };

  // Clock ticks
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch notifications
  useEffect(() => {
    async function loadNotifications() {
      if (!user) return;
      try {
        const data = await analyticsService.getDashboard();
        setNotifications(data.notifications || [
          { id: 1, title: 'License Expiry Alert', message: 'Driver Robert Johnson license expired on 2026-05-01.', type: 'Danger', is_read: 0, created_at: new Date() },
          { id: 2, title: 'Vehicle In Shop', message: 'Vehicle FL-109-BOX status is In Shop.', type: 'Info', is_read: 0, created_at: new Date() },
          { id: 3, title: 'Driver Suspended', message: 'Safety Officer updated Michael Brown status.', type: 'Warning', is_read: 0, created_at: new Date() }
        ]);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      }
    }
    loadNotifications();
  }, [user]);

  // Count unread
  useEffect(() => {
    const count = notifications.filter(n => !n.is_read).length;
    setUnreadCount(count);
  }, [notifications]);

  // Click outside listener for notifications
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'Danger':
        return <ShieldAlert className="h-4 w-4 text-red-500" />;
      case 'Warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'Success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <header className="h-20 bg-darkbg-navbar/70 backdrop-blur-glass border-b border-white/5 fixed top-0 right-0 left-64 z-20 px-8 flex items-center justify-between">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold font-sans tracking-wide text-white">{getPageTitle()}</h2>
        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 font-medium">
          <span className="h-2 w-2 rounded-full bg-green-500 shadow-sm shadow-green-500 animate-pulse"></span>
          <span>System Status: Operational</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-6">
        {/* Live Clock */}
        <div className="hidden xl:flex items-center gap-2 text-gray-400 bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-xs font-semibold select-none">
          <Clock className="h-4 w-4 text-brand-orange" />
          <span>
            {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <span className="text-white/20">|</span>
          <span className="text-white tracking-widest">
            {currentTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        {/* Global Search Bar */}
        <div className="relative w-64 hidden md:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search everywhere..."
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-gray-200 focus:outline-none focus:border-brand-orange/50 transition-all duration-200"
          />
        </div>

        {/* Notification Bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-all duration-150 relative active:scale-95"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-brand-orange text-white text-[10px] font-extrabold flex items-center justify-center rounded-full animate-bounce border border-darkbg-base">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-darkbg-sidebar border border-white/15 shadow-2xl rounded-2xl overflow-hidden z-50">
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <span className="text-xs font-bold text-white tracking-wider uppercase">Notifications Center</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[10px] text-brand-orange hover:text-white font-bold uppercase transition-colors"
                  >
                    Mark All Read
                  </button>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-white/5">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-500">
                    No active notifications or alerts.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`p-4 transition-colors hover:bg-white/5 flex items-start gap-3 ${!n.is_read ? 'bg-brand-orangeLight/5' : ''}`}
                    >
                      <div className="mt-0.5">{getNotificationIcon(n.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{n.title}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{n.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-3 bg-black/10 border-t border-white/5 text-center">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Logged as {user?.role}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
