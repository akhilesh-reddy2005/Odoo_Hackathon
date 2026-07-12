import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Bell, Search, Menu, Clock, ShieldAlert, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { analyticsService } from '../services/api';
import ThemeToggle from './ThemeToggle';

export default function Navbar({ onMenuClick = () => {} }) {
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
        return <ShieldAlert className="h-4 w-4 text-rose-500" />;
      case 'Warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'Success':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <header className="h-16 bg-surface/90 backdrop-blur-sm border-b border-line fixed top-0 right-0 left-0 lg:left-64 z-30 px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Menu + Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={onMenuClick} className="p-2 -ml-2 text-ink-secondary hover:text-ink-primary lg:hidden">
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink-primary tracking-tight truncate">{getPageTitle()}</h2>
          <div className="hidden sm:flex items-center gap-1.5 mt-0.5 text-xs text-ink-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            <span>System Operational</span>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Live Clock */}
        <div className="hidden xl:flex items-center gap-2 text-ink-secondary bg-surface-sunken border border-line rounded-lg px-3 py-2 text-xs font-medium select-none">
          <Clock className="h-3.5 w-3.5 text-ink-muted" />
          <span>
            {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <span className="text-line">|</span>
          <span className="text-ink-primary font-mono tabular-nums">
            {currentTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        {/* Global Search Bar */}
        <div className="relative w-56 hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
          <input
            type="text"
            placeholder="Search everywhere..."
            className="w-full bg-surface-sunken hover:bg-surface-hover border border-line rounded-lg pl-9 pr-4 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all duration-150"
          />
        </div>

        <ThemeToggle />

        {/* Notification Bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2.5 bg-surface hover:bg-surface-hover border border-line rounded-lg text-ink-secondary hover:text-ink-primary transition-all duration-150 relative active:scale-95"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-brand text-white text-[10px] font-semibold flex items-center justify-center rounded-full ring-2 ring-surface">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-surface border border-line shadow-lg rounded-xl overflow-hidden z-50">
              <div className="p-4 border-b border-line flex items-center justify-between">
                <span className="text-sm font-semibold text-ink-primary">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-brand hover:text-brand-hover font-medium transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-line-subtle">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-ink-muted">
                    No active notifications or alerts.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-4 transition-colors hover:bg-surface-hover flex items-start gap-3 ${!n.is_read ? 'bg-brand-light/40' : ''}`}
                    >
                      <div className="mt-0.5">{getNotificationIcon(n.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink-primary truncate">{n.title}</p>
                        <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">{n.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2.5 bg-surface-sunken border-t border-line text-center">
                <span className="text-xs text-ink-muted font-medium">Logged in as {user?.role}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
