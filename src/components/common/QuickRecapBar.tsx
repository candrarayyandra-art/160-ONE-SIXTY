import React from 'react';

export interface RecapItem {
  label: string;
  value: string | number;
  highlight?: boolean;
  color?: 'default' | 'emerald' | 'amber' | 'rose' | 'sky';
}

interface QuickRecapBarProps {
  items: RecapItem[];
}

export const QuickRecapBar: React.FC<QuickRecapBarProps> = ({ items }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2 my-3 no-print">
      {items.map((item, idx) => {
        let colorClass = 'bg-white border-slate-200 text-slate-800';
        if (item.color === 'emerald') colorClass = 'bg-emerald-50/70 border-emerald-200 text-emerald-800';
        if (item.color === 'amber') colorClass = 'bg-amber-50/70 border-amber-200 text-amber-800';
        if (item.color === 'rose') colorClass = 'bg-rose-50/70 border-rose-200 text-rose-800';
        if (item.color === 'sky') colorClass = 'bg-sky-50/70 border-sky-200 text-sky-800';

        return (
          <div
            key={idx}
            className={`p-2.5 rounded-2xl border transition shadow-2xs flex flex-col justify-between ${colorClass}`}
          >
            <span className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase truncate">
              {item.label}
            </span>
            <span className="text-sm sm:text-base font-extrabold mt-0.5 truncate tracking-tight">
              {item.value}
            </span>
          </div>
        );
      })}
    </div>
  );
};
