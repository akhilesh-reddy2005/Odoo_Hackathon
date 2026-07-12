import React from 'react';

// Skeletons for Cards
export function CardSkeleton() {
  return (
    <div className="glass-card p-6 animate-pulse space-y-4">
      <div className="flex justify-between items-center">
        <div className="h-4 bg-white/10 rounded w-1/3"></div>
        <div className="h-8 w-8 bg-white/10 rounded-lg"></div>
      </div>
      <div className="h-8 bg-white/10 rounded w-1/2"></div>
      <div className="h-3 bg-white/10 rounded w-2/3"></div>
    </div>
  );
}

// Skeletons for Tables
export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="w-full glass-card overflow-hidden animate-pulse">
      <div className="bg-white/5 h-12 flex items-center px-6 border-b border-white/5">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-white/10 rounded w-1/6 mr-4"></div>
        ))}
      </div>
      <div className="divide-y divide-white/5">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="h-16 flex items-center px-6">
            {Array.from({ length: cols }).map((_, colIndex) => (
              <div 
                key={colIndex} 
                className={`h-3 bg-white/5 rounded mr-4 ${
                  colIndex === 0 ? 'w-1/4' : colIndex === 1 ? 'w-1/3' : 'w-1/6'
                }`}
              ></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Skeletons for Charts
export function ChartSkeleton() {
  return (
    <div className="glass-card p-6 animate-pulse flex flex-col h-80 justify-between">
      <div className="flex justify-between items-center mb-6">
        <div className="h-4 bg-white/10 rounded w-1/4"></div>
        <div className="h-4 bg-white/10 rounded w-16"></div>
      </div>
      <div className="flex-1 flex items-end gap-4 px-4 pb-4">
        <div className="h-1/3 bg-white/5 rounded-t w-full"></div>
        <div className="h-2/3 bg-white/10 rounded-t w-full"></div>
        <div className="h-1/2 bg-white/5 rounded-t w-full"></div>
        <div className="h-3/4 bg-white/10 rounded-t w-full"></div>
        <div className="h-2/5 bg-white/5 rounded-t w-full"></div>
        <div className="h-5/6 bg-white/10 rounded-t w-full"></div>
      </div>
      <div className="h-3 bg-white/5 rounded w-full mt-4"></div>
    </div>
  );
}
