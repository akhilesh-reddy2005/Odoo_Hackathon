// Shared chart palette — mid-tone (500-weight) values chosen to read clearly
// against both the light and dark surface colors, so charts don't need
// separate per-theme palettes.
export const CHART_COLORS = {
  indigo: '#6366F1',
  blue: '#3B82F6',
  emerald: '#10B981',
  amber: '#F59E0B',
  rose: '#F43F5E',
  slate: '#64748B',
};

export const CHART_COLOR_SEQUENCE = [
  CHART_COLORS.indigo,
  CHART_COLORS.emerald,
  CHART_COLORS.blue,
  CHART_COLORS.amber,
  CHART_COLORS.rose,
  CHART_COLORS.slate,
];

// Recharts tooltip content style — reads live CSS variables so it repaints
// automatically when the theme toggles.
export const CHART_TOOLTIP_STYLE = {
  background: 'rgb(var(--bg-surface))',
  border: '1px solid rgb(var(--border-default))',
  borderRadius: '8px',
  fontSize: '12px',
  color: 'rgb(var(--text-primary))',
};

export const CHART_TOOLTIP_LABEL_STYLE = {
  color: 'rgb(var(--text-primary))',
  fontWeight: 600,
};
