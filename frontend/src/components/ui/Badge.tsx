import React from 'react';

export type BadgeVariant = 'emerald' | 'amber' | 'rose' | 'slate' | 'indigo' | 'blue' | 'violet' | 'cyan';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  pulseDot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'slate',
  size = 'sm',
  dot = false,
  pulseDot = false,
  children,
  className = '',
  ...props
}) => {
  const sizeClasses: Record<BadgeSize, string> = {
    sm: 'text-[11px] font-semibold px-2.5 py-0.5 gap-1.5 rounded-full',
    md: 'text-xs font-semibold px-3 py-1 gap-1.5 rounded-full',
    lg: 'text-xs font-bold px-3.5 py-1.5 gap-2 rounded-full',
  };

  const variantClasses: Record<BadgeVariant, { container: string; dot: string }> = {
    emerald: {
      container: 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 backdrop-blur-xs',
      dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
    },
    amber: {
      container: 'bg-amber-500/10 text-amber-700 border border-amber-500/30 backdrop-blur-xs',
      dot: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
    },
    rose: {
      container: 'bg-rose-500/10 text-rose-700 border border-rose-500/30 backdrop-blur-xs',
      dot: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]',
    },
    slate: {
      container: 'bg-slate-100/90 text-slate-700 border border-slate-200/90 backdrop-blur-xs',
      dot: 'bg-slate-400',
    },
    indigo: {
      container: 'bg-indigo-500/10 text-indigo-700 border border-indigo-500/30 backdrop-blur-xs',
      dot: 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]',
    },
    violet: {
      container: 'bg-purple-500/10 text-purple-700 border border-purple-500/30 backdrop-blur-xs',
      dot: 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]',
    },
    cyan: {
      container: 'bg-cyan-500/10 text-cyan-700 border border-cyan-500/30 backdrop-blur-xs',
      dot: 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]',
    },
    blue: {
      container: 'bg-blue-500/10 text-blue-700 border border-blue-500/30 backdrop-blur-xs',
      dot: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]',
    },
  };

  const currentVariant = variantClasses[variant] || variantClasses.slate;

  return (
    <span
      className={`inline-flex items-center tracking-tight transition-colors select-none ${sizeClasses[size]} ${currentVariant.container} ${className}`}
      {...props}
    >
      {dot && (
        <span className="relative flex h-2 w-2 shrink-0">
          {pulseDot && (
            <span
              className={`animate-radar absolute inline-flex h-full w-full rounded-full opacity-75 ${currentVariant.dot}`}
            />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${currentVariant.dot}`} />
        </span>
      )}
      {children}
    </span>
  );
};

export default Badge;
