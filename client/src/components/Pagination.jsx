import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, limit, total, onPageChange }) {
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const hasPrev = page > 1;
  const hasNext = end < total;

  return (
    <div className="px-6 py-4 bg-surface-sunken border-t border-line flex items-center justify-between">
      <p className="text-xs text-ink-muted font-medium">
        Showing <span className="text-ink-secondary font-semibold">{start}-{end}</span> of{' '}
        <span className="text-ink-secondary font-semibold">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrev}
          className="p-2 bg-surface border border-line rounded-lg text-ink-secondary hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs text-ink-muted font-medium px-1">Page {page}</span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNext}
          className="p-2 bg-surface border border-line rounded-lg text-ink-secondary hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
