import React from 'react';

export interface ProgressBarProps {
  value: number; // e.g. current used quota in GB
  max: number; // e.g. total quota in GB
  showLabel?: boolean;
  labelFormat?: (value: number, max: number, percent: number) => React.ReactNode;
  height?: 'sm' | 'md' | 'lg';
  className?: string;
  variant?: 'auto' | 'indigo' | 'emerald' | 'amber' | 'cyan';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  showLabel = false,
  labelFormat,
  height = 'sm',
  className = '',
  variant = 'auto',
}) => {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  // Threshold-based color calculation
  let barGradient = 'bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[0_0_10px_rgba(16,185,129,0.35)]';
  if (variant === 'auto') {
    if (percent >= 90) {
      barGradient = 'bg-gradient-to-r from-rose-500 to-red-600 shadow-[0_0_10px_rgba(244,63,94,0.4)]';
    } else if (percent >= 70) {
      barGradient = 'bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_10px_rgba(245,158,11,0.35)]';
    }
  } else if (variant === 'indigo') {
    barGradient = 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_10px_rgba(99,102,241,0.35)]';
  } else if (variant === 'cyan') {
    barGradient = 'bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_10px_rgba(6,182,212,0.35)]';
  } else if (variant === 'emerald') {
    barGradient = 'bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[0_0_10px_rgba(16,185,129,0.35)]';
  } else if (variant === 'amber') {
    barGradient = 'bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_10px_rgba(245,158,11,0.35)]';
  }

  const heightClass = height === 'sm' ? 'h-2' : height === 'md' ? 'h-3' : 'h-4';

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums">
          {labelFormat ? (
            labelFormat(value, max, percent)
          ) : (
            <>
              <span>{value.toFixed(1)} GB / {max.toFixed(1)} GB</span>
              <span className="font-bold text-slate-800">{percent.toFixed(0)}%</span>
            </>
          )}
        </div>
      )}
      <div className={`w-full bg-slate-200/60 backdrop-blur-xs rounded-full overflow-hidden ${heightClass} p-[2px]`}>
        <div
          className={`h-full ${barGradient} transition-all duration-500 ease-out rounded-full relative overflow-hidden`}
          style={{ width: `${percent}%` }}
        >
          {/* Subtle animated sheen */}
          <div className="absolute inset-0 bg-white/20 animate-shimmer" />
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;
