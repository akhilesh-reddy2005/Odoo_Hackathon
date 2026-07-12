import React from 'react';

// Master status → tone mapping used across the app. Keeps "Available",
// "Completed", "On Trip", "Dispatched", etc. consistent everywhere instead
// of each page inventing its own color scheme.
const STATUS_TONE_MAP = {
  available: 'success',
  completed: 'success',
  active: 'success',
  paid: 'success',
  'on trip': 'info',
  dispatched: 'info',
  'in progress': 'info',
  'in shop': 'warning',
  high: 'warning',
  expiring: 'warning',
  'expiring soon': 'warning',
  pending: 'neutral',
  retired: 'danger',
  suspended: 'danger',
  cancelled: 'danger',
  critical: 'danger',
  expired: 'danger',
  'off duty': 'neutral',
  draft: 'neutral',
  low: 'neutral',
  medium: 'info',
  other: 'neutral',
};

const TONE_CLASSES = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  info: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  danger: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
  neutral: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20',
};

// Resolve a status string to a tone automatically when no explicit tone prop is given.
export function toneForStatus(status) {
  if (!status) return 'neutral';
  return STATUS_TONE_MAP[String(status).toLowerCase()] || 'neutral';
}

export default function Badge({ tone, status, children, className = '' }) {
  const resolvedTone = tone || toneForStatus(status);
  const classes = TONE_CLASSES[resolvedTone] || TONE_CLASSES.neutral;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${classes} ${className}`}>
      {children || status}
    </span>
  );
}
