import React from 'react';
import { X } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

interface DialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  children?: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  title,
  description,
  onClose,
  onConfirm,
  confirmLabel,
  cancelLabel,
  isDestructive = false,
  children
}) => {
  const { t } = useApp();

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div className="w-full max-w-sm rounded-xl bg-app-surface border border-app p-5 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col">
            <h2 id="dialog-title" className="font-bold text-lg text-app-primary leading-tight">
              {title}
            </h2>
            {description && (
              <p className="text-sm text-app-muted mt-1 leading-normal">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeDialog}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-app-muted hover:text-app-primary hover:bg-app-surface-2 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Optional Custom Content */}
        {children && <div className="py-1">{children}</div>}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-12 rounded-xl bg-app-surface-2 border border-app text-app-primary font-semibold text-sm hover:bg-app-surface transition-colors"
          >
            {cancelLabel || t.cancel}
          </button>
          {onConfirm && (
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 h-12 rounded-xl font-bold text-sm transition-colors ${
                isDestructive
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-app-accent hover:opacity-90 text-on-accent'
              }`}
            >
              {confirmLabel || t.confirm}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
