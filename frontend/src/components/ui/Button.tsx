import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'gradient' | 'danger' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-semibold transition-all duration-200 rounded-xl cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.97]';

  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  const variantClasses: Record<ButtonVariant, string> = {
    gradient: 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/35 hover:-translate-y-0.5 border border-white/20 animate-shimmer',
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/25 hover:shadow-md hover:shadow-indigo-600/35 hover:-translate-y-0.5 border border-transparent',
    secondary: 'bg-white/90 backdrop-blur-xs text-slate-700 border border-slate-200/90 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-300 shadow-xs hover:-translate-y-0.5',
    outline: 'bg-transparent text-slate-700 border border-slate-300 hover:bg-slate-100 hover:text-indigo-600 hover:border-indigo-300 hover:-translate-y-0.5',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm shadow-rose-600/20 hover:shadow-md hover:shadow-rose-600/30 hover:-translate-y-0.5 border border-transparent',
    ghost: 'bg-transparent text-slate-600 hover:bg-indigo-50 hover:text-indigo-700',
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      {children}
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};

export default Button;
