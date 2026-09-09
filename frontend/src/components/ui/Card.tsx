import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  variant?: 'default' | 'glass' | 'gradient-border' | 'flat';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverable = false,
  variant = 'glass',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-white rounded-2xl border border-slate-200/80 shadow-xs',
    glass: 'glass-card rounded-2xl',
    'gradient-border': 'glass-card rounded-2xl relative before:absolute before:-inset-[1px] before:rounded-[17px] before:bg-gradient-to-r before:from-indigo-500 before:via-purple-500 before:to-pink-500 before:-z-10 before:opacity-75',
    flat: 'bg-slate-50/80 rounded-2xl border border-slate-200/70',
  };

  const hoverStyle = hoverable
    ? 'glass-card-hover cursor-pointer'
    : '';

  return (
    <div
      className={`${variantStyles[variant]} ${hoverStyle} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`p-5 pb-3 border-b border-slate-100/80 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <h3 className={`text-sm font-bold text-slate-900 tracking-tight ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <p className={`text-xs text-slate-500 mt-0.5 leading-relaxed ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`p-5 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`p-4 pt-3 border-t border-slate-100/80 bg-slate-50/40 rounded-b-2xl flex items-center justify-between ${className}`} {...props}>
    {children}
  </div>
);

export default Card;
