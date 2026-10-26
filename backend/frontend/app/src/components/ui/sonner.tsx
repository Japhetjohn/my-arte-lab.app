import React, { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import { Check, X, Zap } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

// ============================================================================
// Types & Defaults
// ============================================================================

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'update' | 'loading' | 'default';

export interface ToastAction {
  label: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export interface ToastOptions {
  id?: string | number;
  title?: React.ReactNode;
  description?: React.ReactNode;
  duration?: number;
  action?: ToastAction;
  cancel?: ToastAction;
  onDismiss?: (toast: ToastItem) => void;
  onAutoClose?: (toast: ToastItem) => void;
  dismissible?: boolean;
  type?: ToastType;
  icon?: React.ReactNode;
  className?: string;
}

export interface ToastItem extends ToastOptions {
  id: string | number;
  createdAt: number;
  duration: number;
  type: ToastType;
  title: React.ReactNode;
  description?: React.ReactNode;
  isExiting?: boolean;
}

export interface ToasterProps {
  position?: 'top-right' | 'top-center' | 'top-left' | 'bottom-right' | 'bottom-center' | 'bottom-left';
  visibleToasts?: number;
  duration?: number;
  closeButton?: boolean;
  gap?: number;
  className?: string;
  theme?: 'light' | 'dark' | 'system';
  toastOptions?: any;
  icons?: any;
  expand?: boolean;
}

export const TOAST_DURATIONS: Record<ToastType, number> = {
  success: 4000,
  info: 4500,
  update: 5000,
  warning: 5500,
  error: 7000,
  loading: Infinity,
  default: 4500,
};

// ============================================================================
// Store & State Management
// ============================================================================

let toastCounter = 0;
const recentToasts = new Map<string, number>();
const DEDUPE_WINDOW_MS = 1500;

class ToastStore {
  private toasts: ToastItem[] = [];
  private listeners: Set<() => void> = new Set();

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => {
    return this.toasts;
  };

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  add(item: Omit<ToastItem, 'id' | 'createdAt'> & { id?: string | number }): string | number {
    const id = item.id ?? `toast-${Date.now()}-${++toastCounter}`;
    const newItem: ToastItem = {
      ...item,
      id,
      createdAt: Date.now(),
      duration: item.duration ?? TOAST_DURATIONS[item.type] ?? 4500,
      isExiting: false,
    };

    // When a new notification happens, immediately clear any previous notification and show the new one
    this.toasts = [newItem];
    this.notify();
    return id;
  }

  update(id: string | number, updates: Partial<ToastItem>) {
    this.toasts = this.toasts.map((t) => (t.id === id ? { ...t, ...updates } : t));
    this.notify();
  }

  markExiting(id: string | number) {
    this.toasts = this.toasts.map((t) => (t.id === id ? { ...t, isExiting: true } : t));
    this.notify();
  }

  remove(id: string | number) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  clear() {
    this.toasts = [];
    this.notify();
  }
}

const store = new ToastStore();

function shouldFilterDuplicate(type: ToastType, title: any, description?: any): boolean {
  try {
    const key = `${type}:${typeof title === 'string' ? title : JSON.stringify(title)}:${
      typeof description === 'string' ? description : JSON.stringify(description || '')
    }`;
    const now = Date.now();
    const lastTime = recentToasts.get(key);
    if (lastTime && now - lastTime < DEDUPE_WINDOW_MS) {
      return true;
    }
    recentToasts.set(key, now);
    if (recentToasts.size > 50) {
      for (const [k, time] of recentToasts.entries()) {
        if (now - time > 10000) recentToasts.delete(k);
      }
    }
  } catch {
    // If serialization fails, do not drop toast
  }
  return false;
}

function parseToastArgs(
  type: ToastType,
  titleOrOptions: any,
  options?: ToastOptions
): { title: React.ReactNode; options: ToastOptions } {
  if (typeof titleOrOptions === 'object' && titleOrOptions !== null && !React.isValidElement(titleOrOptions)) {
    if ('title' in titleOrOptions || 'message' in titleOrOptions) {
      const { title, message, ...rest } = titleOrOptions;
      return {
        title: title || message,
        options: { ...rest, ...options, type },
      };
    }
  }

  return {
    title: titleOrOptions,
    options: { ...options, type },
  };
}

// ============================================================================
// Public Toast Emitter
// ============================================================================

function createToastMethod(type: ToastType) {
  return (titleOrOptions: any, options?: ToastOptions): string | number => {
    const parsed = parseToastArgs(type, titleOrOptions, options);
    if (shouldFilterDuplicate(type, parsed.title, parsed.options.description)) {
      return '';
    }
    return store.add({
      type,
      title: parsed.title,
      description: parsed.options.description,
      duration: parsed.options.duration ?? TOAST_DURATIONS[type],
      action: parsed.options.action,
      cancel: parsed.options.cancel,
      onDismiss: parsed.options.onDismiss,
      onAutoClose: parsed.options.onAutoClose,
      dismissible: parsed.options.dismissible ?? true,
      icon: parsed.options.icon,
      id: parsed.options.id,
      className: parsed.options.className,
    });
  };
}

export const toast = Object.assign(
  (titleOrOptions: any, options?: ToastOptions) => {
    return createToastMethod('default')(titleOrOptions, options);
  },
  {
    success: createToastMethod('success'),
    error: createToastMethod('error'),
    info: createToastMethod('info'),
    warning: createToastMethod('warning'),
    update: createToastMethod('update'),
    loading: createToastMethod('loading'),
    message: createToastMethod('default'),
    dismiss: (id?: string | number) => {
      if (id !== undefined) {
        store.markExiting(id);
        setTimeout(() => store.remove(id), 220);
      } else {
        const current = store.getSnapshot();
        current.forEach((t) => store.markExiting(t.id));
        setTimeout(() => store.clear(), 220);
      }
    },
    promise: <T,>(
      promise: Promise<T>,
      data: {
        loading: React.ReactNode;
        success: React.ReactNode | ((result: T) => React.ReactNode);
        error: React.ReactNode | ((err: any) => React.ReactNode);
        description?: React.ReactNode;
      }
    ) => {
      const id = toast.loading(data.loading, { description: data.description });
      promise
        .then((res) => {
          const successTitle = typeof data.success === 'function' ? data.success(res) : data.success;
          store.add({
            id,
            type: 'success',
            title: successTitle,
            duration: TOAST_DURATIONS.success,
          });
        })
        .catch((err) => {
          const errorTitle = typeof data.error === 'function' ? data.error(err) : data.error;
          store.add({
            id,
            type: 'error',
            title: errorTitle,
            duration: TOAST_DURATIONS.error,
          });
        });
      return id;
    },
    custom: (render: (id: string | number) => React.ReactNode, options?: ToastOptions) => {
      const id = options?.id ?? `toast-custom-${Date.now()}-${++toastCounter}`;
      store.add({
        id,
        type: 'default',
        title: render(id),
        duration: options?.duration ?? 4500,
        ...options,
      });
      return id;
    },
  }
);

// ============================================================================
// Toast Component Card (Matches Reference Image)
// ============================================================================

interface ToastCardProps {
  toast: ToastItem;
  onDismiss: (id: string | number) => void;
}

const ToastCard = React.memo(function ToastCard({ toast: item, onDismiss }: ToastCardProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [isExiting, setIsExiting] = useState(item.isExiting ?? false);
  const [isMounted, setIsMounted] = useState(false);
  
  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(item.duration);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger smooth entrance animation on mount
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setIsMounted(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Sync external exit request
  useEffect(() => {
    if (item.isExiting && !isExiting) {
      setIsExiting(true);
    }
  }, [item.isExiting, isExiting]);

  const handleDismiss = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(item.id);
      item.onDismiss?.(item);
    }, 220);
  }, [isExiting, item, onDismiss]);

  // When the progress line reaches 0%, onAnimationEnd fires.
  // We ensure the line visibly clears before the card disappears.
  const handleAnimationEnd = (e: React.AnimationEvent) => {
    if (e.animationName !== 'toast-shrink') return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // Give a 150ms pause showing the line completely cleared before starting the exit slide
    setTimeout(() => {
      handleDismiss();
    }, 150);
  };

  const startFallbackTimer = useCallback(
    (durationMs: number) => {
      if (durationMs === Infinity || durationMs <= 0) return;
      startTimeRef.current = Date.now();
      // Safety fallback in case animation events are suppressed
      timerRef.current = setTimeout(() => {
        handleDismiss();
      }, durationMs + 800);
    },
    [handleDismiss]
  );

  useEffect(() => {
    startFallbackTimer(item.duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [item.duration, startFallbackTimer]);

  const handleMouseEnter = () => {
    if (item.duration === Infinity) return;
    setIsPaused(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const elapsed = Date.now() - startTimeRef.current;
    remainingTimeRef.current = Math.max(remainingTimeRef.current - elapsed, 200);
  };

  const handleMouseLeave = () => {
    if (item.duration === Infinity) return;
    setIsPaused(false);
    startFallbackTimer(remainingTimeRef.current);
  };

  // --------------------------------------------------------------------------
  // Visual Theme Variations matching CreateUI reference
  // --------------------------------------------------------------------------

  const renderIcon = () => {
    if (item.icon) {
      return <div className="shrink-0">{item.icon}</div>;
    }

    switch (item.type) {
      case 'error':
        // Solid red circle with white exclamation mark
        return (
          <div className="w-5 h-5 rounded-full bg-[#EF4444] text-white flex items-center justify-center shrink-0 font-bold text-xs select-none shadow-2xs">
            !
          </div>
        );
      case 'success':
        // Solid green circle with white checkmark
        return (
          <div className="w-5 h-5 rounded-full bg-[#10B981] text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Check className="w-3.5 h-3.5 stroke-[3] text-white" />
          </div>
        );
      case 'update':
        // Purple lightning bolt icon
        return (
          <div className="w-5 h-5 flex items-center justify-center shrink-0 text-[#9747FF]">
            <Zap className="w-4 h-4 fill-[#9747FF] text-[#9747FF]" />
          </div>
        );
      case 'loading':
        return (
          <div className="w-5 h-5 flex items-center justify-center shrink-0">
            <Spinner size="sm" variant="primary" />
          </div>
        );
      case 'warning':
        return (
          <div className="w-5 h-5 rounded-full bg-[#F59E0B] text-white flex items-center justify-center shrink-0 font-bold text-xs select-none shadow-2xs">
            !
          </div>
        );
      case 'info':
      default:
        // Solid purple circle with white 'i'
        return (
          <div className="w-5 h-5 rounded-full bg-[#9747FF] text-white flex items-center justify-center shrink-0 font-serif font-bold text-xs select-none shadow-2xs">
            i
          </div>
        );
    }
  };

  // Card background and border treatments
  let cardStyles = 'bg-white dark:bg-[#1e1f20] border-gray-200/80 dark:border-[#2f3032] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_4px_10px_-2px_rgba(0,0,0,0.04)]';
  let progressColor = 'bg-[#9747FF]';
  let titleColor = 'text-gray-900 dark:text-gray-100';

  if (item.type === 'error') {
    // Subtle red surface per reference Card 1
    cardStyles = 'bg-[#FEF2F2] dark:bg-[#2c1517] border-red-200/70 dark:border-red-900/60 shadow-[0_10px_25px_-5px_rgba(239,68,68,0.1),0_4px_10px_-2px_rgba(239,68,68,0.04)]';
    progressColor = 'bg-[#EF4444]';
    titleColor = 'text-gray-950 dark:text-red-100 font-bold';
  } else if (item.type === 'success') {
    // Clean light surface per reference Card 2
    cardStyles = 'bg-white dark:bg-[#1e1f20] border-gray-200/80 dark:border-[#2f3032] shadow-[0_10px_25px_-5px_rgba(16,185,129,0.08),0_4px_10px_-2px_rgba(0,0,0,0.03)]';
    progressColor = 'bg-[#10B981]';
  } else if (item.type === 'update') {
    // Subtle purple accent for update per reference Card 4
    cardStyles = 'bg-white dark:bg-[#1e1f20] border-purple-200/70 dark:border-purple-900/40 shadow-[0_10px_25px_-5px_rgba(151,71,255,0.08),0_4px_10px_-2px_rgba(0,0,0,0.03)]';
    progressColor = 'bg-[#9747FF]';
    titleColor = 'text-[#6D28D9] dark:text-[#c084fc] sm:text-gray-950 sm:dark:text-gray-100';
  } else if (item.type === 'info') {
    cardStyles = 'bg-white dark:bg-[#1e1f20] border-purple-200/70 dark:border-purple-900/40 shadow-[0_10px_25px_-5px_rgba(151,71,255,0.08),0_4px_10px_-2px_rgba(0,0,0,0.03)]';
    progressColor = 'bg-[#9747FF]';
  } else if (item.type === 'warning') {
    cardStyles = 'bg-[#FFFBEB] dark:bg-[#2d230e] border-amber-200/80 dark:border-amber-900/60 shadow-[0_10px_25px_-5px_rgba(245,158,11,0.08),0_4px_10px_-2px_rgba(0,0,0,0.03)]';
    progressColor = 'bg-[#F59E0B]';
    titleColor = 'text-amber-950 dark:text-amber-100';
  }

  const hasDescription = Boolean(item.description);

  return (
    <div
      role={item.type === 'error' ? 'alert' : 'status'}
      aria-live={item.type === 'error' ? 'assertive' : 'polite'}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'group relative w-full overflow-hidden rounded-2xl border transition-all duration-200 ease-out select-none',
        cardStyles,
        // Entry and Exit animations
        !isMounted && '-translate-y-4 opacity-0 scale-95',
        isMounted && !isExiting && 'translate-y-0 opacity-100 scale-100',
        isExiting && '-translate-y-3 opacity-0 scale-95 pointer-events-none',
        item.className
      )}
    >
      {/* Toast Content Row */}
      <div className={cn('flex items-center gap-3 px-3.5', hasDescription ? 'py-3 items-start' : 'py-2.5')}>
        {/* Status Icon */}
        <div className={cn('flex items-center justify-center shrink-0', hasDescription && 'mt-0.5')}>
          {renderIcon()}
        </div>

        {/* Text Container: Title & Description */}
        <div className="flex-1 min-w-0 pr-1">
          <div className={cn('text-[13px] sm:text-sm font-semibold tracking-tight leading-snug', titleColor)}>
            {item.title}
          </div>
          {hasDescription && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed break-words">
              {item.description}
            </div>
          )}
        </div>

        {/* Action Controls: Action Button + Close Button */}
        <div className={cn('flex items-center gap-1.5 shrink-0', hasDescription && 'mt-0.5')}>
          {item.action && (
            <button
              type="button"
              onClick={(e) => {
                item.action?.onClick(e);
                handleDismiss();
              }}
              className="px-2.5 py-1 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer"
            >
              {item.action.label}
            </button>
          )}

          {item.dismissible && (
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss notification"
              className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/20 transition-colors shrink-0 cursor-pointer -mr-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Countdown Bar (Matches Reference Image Cards 2 & 3) */}
      {item.duration !== Infinity && item.duration > 0 && (
        <div className="w-full px-3 pb-1.5">
          <div className="w-full h-[3px] bg-black/[0.04] rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full', progressColor)}
              style={{
                width: '100%',
                animationName: 'toast-shrink',
                animationDuration: `${item.duration}ms`,
                animationTimingFunction: 'linear',
                animationFillMode: 'forwards',
                animationPlayState: isPaused ? 'paused' : 'running',
              }}
              onAnimationEnd={handleAnimationEnd}
            />
          </div>
        </div>
      )}
    </div>
  );
});

// ============================================================================
// Toaster Container Component
// ============================================================================

export function Toaster({
  position = 'top-right',
  gap = 10,
  className,
}: ToasterProps) {
  const toasts = useSyncExternalStore(store.subscribe, store.getSnapshot);

  // Inject CSS Keyframes for GPU-accelerated progress shrinking & responsive animation
  useEffect(() => {
    const styleId = 'myartelab-toast-keyframes';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes toast-shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes toast-shrink {
            from { opacity: 1; }
            to { opacity: 0; }
          }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const handleDismiss = useCallback((id: string | number) => {
    store.remove(id);
  }, []);

  if (toasts.length === 0) return null;

  const isBottom = position.startsWith('bottom');
  let desktopPositionClasses = 'sm:left-auto sm:right-6 sm:top-6 sm:w-[380px] sm:items-end';
  if (position === 'top-center') {
    desktopPositionClasses = 'sm:left-1/2 sm:-translate-x-1/2 sm:top-6 sm:w-[380px] sm:items-center';
  } else if (position === 'top-left') {
    desktopPositionClasses = 'sm:left-6 sm:right-auto sm:top-6 sm:w-[380px] sm:items-start';
  } else if (position === 'bottom-right') {
    desktopPositionClasses = 'sm:left-auto sm:right-6 sm:bottom-6 sm:w-[380px] sm:items-end';
  } else if (position === 'bottom-center') {
    desktopPositionClasses = 'sm:left-1/2 sm:-translate-x-1/2 sm:bottom-6 sm:w-[380px] sm:items-center';
  } else if (position === 'bottom-left') {
    desktopPositionClasses = 'sm:left-6 sm:right-auto sm:bottom-6 sm:w-[380px] sm:items-start';
  }

  return (
    <div
      aria-label="Notifications"
      tabIndex={-1}
      className={cn(
        'fixed z-[99999] pointer-events-none flex flex-col',
        // Mobile positioning: Top or bottom with safe-area spacing and side padding
        isBottom
          ? 'bottom-[max(1rem,env(safe-area-inset-bottom,1rem))] left-4 right-4 items-center'
          : 'top-[max(1rem,env(safe-area-inset-top,1rem))] left-4 right-4 items-center',
        // Desktop positioning: Anchored per position prop
        desktopPositionClasses,
        className
      )}
      style={{ gap: `${gap}px` }}
    >
      {toasts.map((item) => (
        <div key={item.id} className="w-full max-w-sm sm:max-w-none pointer-events-auto">
          <ToastCard toast={item} onDismiss={handleDismiss} />
        </div>
      ))}
    </div>
  );
}
