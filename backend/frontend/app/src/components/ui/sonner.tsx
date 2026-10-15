import {
  CheckCircle2,
  InfoIcon,
  Loader2Icon,
  TriangleAlertIcon,
  XCircle,
} from "lucide-react"
import { toast as sonnerToast, Toaster as Sonner, type ToasterProps } from "sonner"
import { useEffect, useState } from "react"

// Type-specific sensible durations per specification
export const TOAST_DURATIONS = {
  success: 4000,
  info: 4500,
  warning: 5500,
  error: 7000,
  default: 4500,
};

// Deduplication cache to prevent identical error/success floods from repeated renders/effects
const recentToasts = new Map<string, number>();
const DEDUPE_WINDOW_MS = 1500;

function shouldFilterDuplicate(type: string, message: any): boolean {
  try {
    const key = `${type}:${typeof message === 'string' ? message : JSON.stringify(message)}`;
    const now = Date.now();
    const lastTime = recentToasts.get(key);
    if (lastTime && now - lastTime < DEDUPE_WINDOW_MS) {
      return true;
    }
    recentToasts.set(key, now);
    if (recentToasts.size > 60) {
      for (const [k, time] of recentToasts.entries()) {
        if (now - time > 10000) recentToasts.delete(k);
      }
    }
  } catch {
    // If serialization fails, do not filter
  }
  return false;
}

// Enhance native sonnerToast methods to enforce independent durations and deduplication
const origSuccess = sonnerToast.success.bind(sonnerToast);
const origError = sonnerToast.error.bind(sonnerToast);
const origInfo = sonnerToast.info.bind(sonnerToast);
const origWarning = sonnerToast.warning.bind(sonnerToast);

sonnerToast.success = (message: any, data?: any) => {
  if (shouldFilterDuplicate('success', message)) return '' as any;
  return origSuccess(message, { duration: TOAST_DURATIONS.success, ...data });
};

sonnerToast.error = (message: any, data?: any) => {
  if (shouldFilterDuplicate('error', message)) return '' as any;
  return origError(message, { duration: TOAST_DURATIONS.error, ...data });
};

sonnerToast.info = (message: any, data?: any) => {
  if (shouldFilterDuplicate('info', message)) return '' as any;
  return origInfo(message, { duration: TOAST_DURATIONS.info, ...data });
};

sonnerToast.warning = (message: any, data?: any) => {
  if (shouldFilterDuplicate('warning', message)) return '' as any;
  return origWarning(message, { duration: TOAST_DURATIONS.warning, ...data });
};

export const toast = sonnerToast;

// Injected CSS for MyArteLab minimalist fintech styling and mobile responsiveness
const TOAST_OVERRIDE_CSS = `
[data-sonner-toaster] {
  z-index: 99999 !important;
  --gap: 10px !important;
  font-family: inherit !important;
}

/* Desktop positioning & sizing */
@media (min-width: 769px) {
  [data-sonner-toaster] {
    --width: 360px !important;
    --offset-top: 24px !important;
    --offset-right: 24px !important;
  }
}

/* Mobile positioning & safe-area sizing */
@media (max-width: 768px) {
  [data-sonner-toaster] {
    --width: calc(100vw - 32px) !important;
    --offset-top: max(env(safe-area-inset-top, 16px), 16px) !important;
    --offset-left: 16px !important;
    --offset-right: 16px !important;
    left: 16px !important;
    right: 16px !important;
  }
}

/* Clean card presentation */
[data-sonner-toast][data-styled="true"] {
  padding: 12px 14px !important;
  min-height: 48px !important;
  border-radius: 14px !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  gap: 10px !important;
  box-shadow: 0 10px 25px -4px rgba(0, 0, 0, 0.08), 0 4px 8px -2px rgba(0, 0, 0, 0.03) !important;
  border: 1px solid rgba(0, 0, 0, 0.08) !important;
  background: #ffffff !important;
  color: #111827 !important;
  width: var(--width) !important;
  box-sizing: border-box !important;
}

/* Icons */
[data-sonner-toast][data-styled="true"] [data-icon] {
  height: 20px !important;
  width: 20px !important;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  align-self: center !important;
  flex-shrink: 0 !important;
}

[data-sonner-toast][data-styled="true"] [data-icon] svg {
  width: 20px !important;
  height: 20px !important;
}

/* Title & Description */
[data-sonner-toast][data-styled="true"] [data-title] {
  font-size: 13px !important;
  font-weight: 600 !important;
  line-height: 1.35 !important;
  color: #111827 !important;
  word-break: break-word !important;
}

[data-sonner-toast][data-styled="true"] [data-description] {
  font-size: 12px !important;
  line-height: 1.35 !important;
  margin-top: 2px !important;
  color: #6b7280 !important;
  word-break: break-word !important;
}

[data-sonner-toast][data-styled="true"] [data-content] {
  gap: 2px !important;
  flex: 1 !important;
  min-width: 0 !important;
}

/* Close button - visible and accessible on both mobile touch and desktop */
[data-sonner-toast][data-styled="true"] [data-close-button] {
  top: 12px !important;
  left: auto !important;
  right: 10px !important;
  transform: none !important;
  height: 24px !important;
  width: 24px !important;
  background: rgba(0, 0, 0, 0.04) !important;
  border: none !important;
  border-radius: 6px !important;
  opacity: 0.7 !important;
  transition: opacity 0.15s, background-color 0.15s !important;
  color: #6b7280 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  flex-shrink: 0 !important;
}

[data-sonner-toast][data-styled="true"]:hover [data-close-button],
[data-sonner-toast][data-styled="true"] [data-close-button]:hover,
[data-sonner-toast][data-styled="true"] [data-close-button]:active {
  opacity: 1 !important;
  background: rgba(0, 0, 0, 0.08) !important;
  color: #111827 !important;
}
`;

const Toaster = ({ ...props }: ToasterProps) => {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const id = 'sonner-toast-override';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = TOAST_OVERRIDE_CSS;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <Sonner
      theme="light"
      position={props.position || (isMobile ? 'top-center' : 'top-right')}
      expand={props.expand ?? true}
      visibleToasts={props.visibleToasts ?? 3}
      closeButton={props.closeButton ?? true}
      gap={props.gap ?? 10}
      className="toaster group"
      icons={{
        success: <CheckCircle2 className="size-5 text-[#10B981]" />,
        info: <InfoIcon className="size-5 text-[#9747FF]" />,
        warning: <TriangleAlertIcon className="size-5 text-[#F59E0B]" />,
        error: <XCircle className="size-5 text-[#EF4444]" />,
        loading: <Loader2Icon className="size-5 animate-spin text-[#9747FF]" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            'group-[.toaster]:bg-white group-[.toaster]:text-gray-900 group-[.toaster]:border group-[.toaster]:border-gray-200/80 group-[.toaster]:shadow-lg group-[.toaster]:rounded-2xl group-[.toaster]:p-3.5',
          title: 'group-[.toaster]:text-xs group-[.toaster]:font-semibold group-[.toaster]:text-gray-900',
          description: 'group-[.toaster]:text-[11px] group-[.toaster]:text-gray-500 group-[.toaster]:mt-0.5',
          actionButton:
            'group-[.toaster]:bg-[#9747FF] group-[.toaster]:text-white group-[.toaster]:rounded-xl group-[.toaster]:px-3 group-[.toaster]:py-1.5 group-[.toaster]:text-xs group-[.toaster]:font-medium',
          cancelButton:
            'group-[.toaster]:bg-gray-100 group-[.toaster]:text-gray-700 group-[.toaster]:rounded-xl group-[.toaster]:px-3 group-[.toaster]:py-1.5 group-[.toaster]:text-xs group-[.toaster]:font-medium',
          closeButton:
            'group-[.toaster]:text-gray-500 group-[.toaster]:hover:text-gray-900',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
