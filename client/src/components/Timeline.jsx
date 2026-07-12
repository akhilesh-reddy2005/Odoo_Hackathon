import React from 'react';
import { Check } from 'lucide-react';

const TONE_DOT = {
  success: 'bg-emerald-500 border-emerald-500 text-white',
  info: 'bg-blue-500 border-blue-500 text-white',
  warning: 'bg-amber-500 border-amber-500 text-white',
  danger: 'bg-rose-500 border-rose-500 text-white',
  pending: 'bg-surface border-line text-ink-muted',
};

/**
 * steps: Array<{ label: string, timestamp?: string, tone?: 'success'|'info'|'warning'|'danger'|'pending', icon?: LucideIcon, description?: string }>
 */
export default function Timeline({ steps = [], size = 'md' }) {
  const iconBox = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  return (
    <div className="space-y-0">
      {steps.map((step, i) => {
        const tone = step.tone || 'pending';
        const Icon = step.icon || Check;
        const isLast = i === steps.length - 1;

        return (
          <div key={i} className="relative flex items-start gap-4 pb-6 last:pb-0">
            {!isLast && (
              <div className="absolute left-[15px] top-8 bottom-0 w-px bg-line" style={size === 'sm' ? { left: '11px' } : undefined} />
            )}
            <div className={`relative z-10 flex items-center justify-center ${iconBox} rounded-full border ${TONE_DOT[tone]}`}>
              <Icon className={iconSize} />
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <p className="text-sm font-semibold text-ink-primary">{step.label}</p>
              {step.description && <p className="text-xs text-ink-muted mt-0.5">{step.description}</p>}
              {step.timestamp && <p className="text-xs text-ink-muted mt-1 font-mono">{step.timestamp}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
