import React from 'react';
import { PackageOpen } from 'lucide-react';

export default function EmptyState({
  title = 'No records found',
  description = 'Try adjusting your search terms or filters to find what you are looking for.',
  icon: Icon = PackageOpen,
  actionButton
}) {
  return (
    <div className="card p-12 text-center flex flex-col items-center justify-center max-w-xl mx-auto my-8">
      <div className="p-4 bg-surface-sunken rounded-2xl border border-line text-ink-muted mb-4">
        <Icon className="h-8 w-8 text-ink-muted" />
      </div>
      <h3 className="text-base font-semibold text-ink-primary tracking-tight">{title}</h3>
      <p className="text-sm text-ink-muted mt-2 max-w-xs leading-relaxed mx-auto">{description}</p>
      {actionButton && <div className="mt-6">{actionButton}</div>}
    </div>
  );
}
