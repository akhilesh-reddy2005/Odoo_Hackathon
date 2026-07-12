import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle color theme"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`p-2.5 bg-surface hover:bg-surface-hover border border-line rounded-lg text-ink-secondary hover:text-ink-primary transition-all duration-150 active:scale-95 ${className}`}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
