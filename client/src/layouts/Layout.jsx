import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

export default function Layout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface-page text-ink-primary flex">
      {/* Sidebar Navigation */}
      <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      {/* Main View Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Navbar */}
        <Navbar onMenuClick={() => setMobileNavOpen(true)} />

        {/* Content Viewport */}
        <main className="flex-1 mt-16 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
