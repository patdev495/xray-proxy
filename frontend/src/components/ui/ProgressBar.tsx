import React from 'react';

export interface ProgressBarProps {
  value: number; // e.g. current used quota in GB
  max: number; // e.g. total quota in GB
  showLabel?: boolean;
  labelFormat?: (value: number, max: number, percent: number) => React.ReactNode;
  height?: 'sm' | 'md';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  showLabel = false,
  labelFormat,
  height = 'sm',
  className = '',
}) => {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  // Threshold-based color calculation
  let barColor = 'bg-emerald-500';
  if (percent >= 95) {
    barColor = 'bg-rose-500';
  } else if (percent >= 75) {
    barColor = 'bg-amber-500';
  }

  const heightClass = height === 'sm' ? 'h-1.5' : 'h-2.5';

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums">
          {labelFormat ? (
            labelFormat(value, max, percent)
          ) : (
            <>
              <span>{value.toFixed(1)} GB / {max.toFixed(1)} GB</span>
              <span className="font-semibold text-slate-700">{percent.toFixed(0)}%</span>
            </>
          )}
        </div>
      )}
      <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${heightClass}`}>
        <div
          className={`${heightClass} ${barColor} transition-all duration-300 rounded-full`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
