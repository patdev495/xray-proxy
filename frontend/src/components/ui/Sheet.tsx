import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: 'md' | 'lg' | 'xl';
}

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClasses: Record<string, string> = {
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-over Container */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-6 sm:pl-10">
        <div
          className={`w-screen ${widthClasses[width]} bg-white/95 backdrop-blur-2xl shadow-2xl shadow-indigo-950/20 border-l border-white/60 flex flex-col transform transition-transform duration-300 ease-out`}
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100/80 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>
              {description && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 transition-colors cursor-pointer"
              title="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">{children}</div>

          {/* Optional Footer */}
          {footer && (
            <div className="p-5 border-t border-slate-100/80 bg-slate-50/50 backdrop-blur-xs flex items-center justify-end gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sheet;
