import React from 'react';

export type BadgeVariant = 'emerald' | 'amber' | 'rose' | 'slate' | 'indigo' | 'blue';
export type BadgeSize = 'sm' | 'md';

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
    sm: 'text-[11px] font-medium px-2 py-0.5 gap-1.5',
    md: 'text-xs font-medium px-2.5 py-1 gap-1.5',
  };

  const variantClasses: Record<BadgeVariant, { container: string; dot: string }> = {
    emerald: {
      container: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
      dot: 'bg-emerald-500',
    },
    amber: {
      container: 'bg-amber-50 text-amber-700 border border-amber-200/80',
      dot: 'bg-amber-500',
    },
    rose: {
      container: 'bg-rose-50 text-rose-700 border border-rose-200/80',
      dot: 'bg-rose-500',
    },
    slate: {
      container: 'bg-slate-100 text-slate-700 border border-slate-200',
      dot: 'bg-slate-400',
    },
    indigo: {
      container: 'bg-indigo-50 text-indigo-700 border border-indigo-200/80',
      dot: 'bg-indigo-500',
    },
    blue: {
      container: 'bg-blue-50 text-blue-700 border border-blue-200/80',
      dot: 'bg-blue-500',
    },
  };

  const currentVariant = variantClasses[variant];

  return (
    <span
      className={`inline-flex items-center rounded-md tracking-tight ${sizeClasses[size]} ${currentVariant.container} ${className}`}
      {...props}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          {pulseDot && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${currentVariant.dot}`}
            />
          )}
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${currentVariant.dot}`} />
        </span>
      )}
      {children}
    </span>
  );
};

export default Badge;
