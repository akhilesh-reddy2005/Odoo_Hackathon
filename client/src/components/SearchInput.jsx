import React from 'react';
import { Search } from 'lucide-react';

export default function SearchInput({ value, onChange, placeholder = 'Search...', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="input pl-10"
      />
    </div>
  );
}
