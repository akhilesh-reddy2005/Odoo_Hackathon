import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

export default function Layout() {
  return (
    <div className="min-h-screen bg-darkbg-base text-gray-100 flex">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main View Area */}
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        {/* Navbar */}
        <Navbar />

        {/* Content Viewport */}
        <main className="flex-1 mt-20 p-8 overflow-y-auto">
          {/* Subtle background glow blobs */}
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-brand-orange/5 rounded-full blur-[120px] pointer-events-none bg-pulse-glow z-0"></div>
          <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none bg-pulse-glow z-0"></div>

          {/* Router Content Container */}
          <div className="relative z-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
