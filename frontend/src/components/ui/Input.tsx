import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightIcon, hint, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full text-sm bg-white/90 backdrop-blur-xs text-slate-900 placeholder:text-slate-400 border rounded-xl transition-all duration-200 py-2.5 ${
              leftIcon ? 'pl-10' : 'pl-3.5'
            } ${rightIcon ? 'pr-10' : 'pr-3.5'} ${
              error
                ? 'border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15 shadow-[0_0_12px_rgba(244,63,94,0.15)]'
                : 'border-slate-200/90 hover:border-indigo-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 shadow-2xs'
            } focus:outline-none disabled:bg-slate-50/70 disabled:text-slate-400 disabled:cursor-not-allowed ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 flex items-center text-slate-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="text-xs text-rose-600 font-medium animate-in fade-in">{error}</p>
        ) : hint ? (
          <p className="text-[11px] text-slate-400 leading-tight">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
