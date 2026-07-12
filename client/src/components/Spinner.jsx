import React from 'react';

const SIZES = {
  sm: { box: 'h-4 w-4', border: 'border-2' },
  md: { box: 'h-8 w-8', border: 'border-2' },
  lg: { box: 'h-16 w-16', border: 'border-4' },
};

export default function Spinner({ size = 'md', className = '' }) {
  const { box, border } = SIZES[size] || SIZES.md;
  return (
    <div className={`relative ${box} ${className}`}>
      <div className={`absolute inset-0 rounded-full ${border} border-line`} />
      <div className={`absolute inset-0 rounded-full ${border} border-transparent border-t-brand animate-spin`} />
    </div>
  );
}
