import React from 'react';

export function WarningLight({ status }: { status: 'red' | 'yellow' | 'green' }) {
  const colors = {
    red: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]',
    yellow: 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]',
    green: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
  };
  
  return (
    <div className="relative flex items-center justify-center w-4 h-4 shrink-0">
      <div className={`w-3 h-3 rounded-full ${colors[status]}`} />
    </div>
  );
}
