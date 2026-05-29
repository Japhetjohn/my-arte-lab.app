import {
  CheckCircle2,
  InfoIcon,
  Loader2Icon,
  TriangleAlertIcon,
  XCircle,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { useEffect } from "react"

// Inject custom toast styles after sonner loads to ensure they win
const TOAST_OVERRIDE_CSS = `
[data-sonner-toaster] {
  --width: 320px !important;
  --offset-top: 16px !important;
  --offset-bottom: 16px !important;
  --offset-left: 16px !important;
  --offset-right: 16px !important;
  --gap: 8px !important;
}
[data-sonner-toaster][data-sonner-theme="light"] [data-sonner-toast][data-styled="true"],
[data-sonner-toast][data-styled="true"] {
  padding: 10px 14px !important;
  min-height: 44px !important;
  border-radius: 12px !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  gap: 10px !important;
  box-shadow: 0 4px 12px rgba(138, 43, 226, 0.08), 0 2px 4px rgba(0,0,0,0.04) !important;
  border: 1px solid rgba(138, 43, 226, 0.12) !important;
  background: #ffffff !important;
  color: #1f2937 !important;
  width: var(--width) !important;
}
[data-sonner-toast][data-styled="true"] [data-icon] {
  height: 20px !important;
  width: 20px !important;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  align-self: center !important;
}
[data-sonner-toast][data-styled="true"] [data-icon] svg {
  width: 20px !important;
  height: 20px !important;
}
[data-sonner-toast][data-styled="true"] [data-title] {
  font-size: 14px !important;
  font-weight: 600 !important;
  line-height: 1.3 !important;
  color: #1f2937 !important;
}
[data-sonner-toast][data-styled="true"] [data-description] {
  font-size: 12px !important;
  line-height: 1.3 !important;
  margin-top: 2px !important;
  color: #6b7280 !important;
}
[data-sonner-toast][data-styled="true"] [data-content] {
  gap: 2px !important;
}
[data-sonner-toast][data-styled="true"] [data-close-button] {
  top: 50% !important;
  left: auto !important;
  right: 8px !important;
  transform: translateY(-50%) !important;
  height: 22px !important;
  width: 22px !important;
  background: transparent !important;
  border: none !important;
  opacity: 0 !important;
  transition: opacity 0.2s !important;
  color: #9ca3af !important;
}
[data-sonner-toast][data-styled="true"]:hover [data-close-button] {
  opacity: 1 !important;
}
[data-sonner-toast][data-styled="true"] [data-close-button]:hover {
  background: rgba(0,0,0,0.05) !important;
  border-radius: 50% !important;
}
[data-sonner-toaster][data-sonner-theme="light"] [data-sonner-toast][data-styled="true"][data-type="success"],
[data-sonner-toaster][data-sonner-theme="light"] [data-sonner-toast][data-styled="true"][data-type="error"],
[data-sonner-toaster][data-sonner-theme="light"] [data-sonner-toast][data-styled="true"][data-type="info"],
[data-sonner-toaster][data-sonner-theme="light"] [data-sonner-toast][data-styled="true"][data-type="warning"] {
  background: #ffffff !important;
  color: #1f2937 !important;
}
@media (max-width: 640px) {
  [data-sonner-toaster] {
    --width: calc(100vw - 32px) !important;
    --offset-left: 16px !important;
    --offset-right: 16px !important;
  }
}
`

const Toaster = ({ ...props }: ToasterProps) => {
  useEffect(() => {
    // Inject our CSS after a short delay to ensure sonner's CSS is already injected
    const timer = setTimeout(() => {
      const id = 'sonner-toast-override'
      if (document.getElementById(id)) return
      const style = document.createElement('style')
      style.id = id
      style.textContent = TOAST_OVERRIDE_CSS
      document.head.appendChild(style)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CheckCircle2 className="size-5 text-[#8A2BE2]" />,
        info: <InfoIcon className="size-5 text-[#8A2BE2]" />,
        warning: <TriangleAlertIcon className="size-5 text-amber-500" />,
        error: <XCircle className="size-5 text-red-500" />,
        loading: <Loader2Icon className="size-5 animate-spin text-[#8A2BE2]" />,
      }}
      toastOptions={{
        classNames: {
          toast: 'group-[.toaster]:bg-white group-[.toaster]:shadow-md group-[.toaster]:gap-2.5 group-[.toaster]:border group-[.toaster]:border-[#8A2BE2]/10 group-[.toaster]:rounded-xl group-[.toaster]:p-2.5 group-[.toaster]:px-3.5',
          title: 'group-[.toaster]:text-sm group-[.toaster]:font-semibold group-[.toaster]:leading-tight',
          description: 'group-[.toaster]:text-gray-500 group-[.toaster]:text-xs group-[.toaster]:leading-tight group-[.toaster]:mt-0.5',
          actionButton: 'group-[.toaster]:bg-[#8A2BE2] group-[.toaster]:text-white group-[.toaster]:rounded-lg group-[.toaster]:px-3 group-[.toaster]:py-1 group-[.toaster]:text-xs group-[.toaster]:font-semibold group-[.toaster]:hover:bg-[#7B1FD1] group-[.toaster]:transition-colors',
          cancelButton: 'group-[.toaster]:bg-gray-100 group-[.toaster]:text-gray-600 group-[.toaster]:rounded-lg group-[.toaster]:px-3 group-[.toaster]:py-1 group-[.toaster]:text-xs group-[.toaster]:hover:bg-gray-200 group-[.toaster]:transition-colors',
          closeButton: 'group-[.toaster]:opacity-0 group-[.toaster]:hover:opacity-100 group-[.toaster]:transition-opacity',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
