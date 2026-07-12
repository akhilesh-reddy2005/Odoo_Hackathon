import React from 'react';
import { PackageOpen } from 'lucide-react';

export default function EmptyState({ 
  title = 'No records found', 
  description = 'Try adjusting your search terms or filters to find what you are looking for.', 
  icon: Icon = PackageOpen,
  actionButton 
}) {
  return (
    <div className="glass-card p-12 text-center flex flex-col items-center justify-center max-w-xl mx-auto my-8 border border-white/5">
      <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-gray-500 mb-4">
        <Icon className="h-10 w-10 text-brand-orange/60" />
      </div>
      <h3 className="text-base font-bold text-white font-sans tracking-wide">{title}</h3>
      <p className="text-xs text-gray-400 mt-2 max-w-xs leading-relaxed mx-auto">{description}</p>
      {actionButton && <div className="mt-6">{actionButton}</div>}
    </div>
  );
}
