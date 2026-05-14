import {
  InfoIcon,
  Loader2Icon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { AnimatedCheckmark } from "./AnimatedCheckmark"
import { AnimatedError } from "./AnimatedError"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <AnimatedCheckmark size={22} color="#8A2BE2" />,
        info: <InfoIcon className="size-4 text-[#8A2BE2]" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-500" />,
        error: <AnimatedError size={22} color="#EF4444" />,
        loading: <Loader2Icon className="size-4 animate-spin text-[#8A2BE2]" />,
      }}
      toastOptions={{
        style: {
          background: '#ffffff',
          color: '#1f2937',
          border: '1px solid rgba(138, 43, 226, 0.15)',
          borderRadius: '1rem',
          boxShadow: '0 10px 25px -5px rgba(138, 43, 226, 0.1), 0 4px 10px -2px rgba(0, 0, 0, 0.05)',
          padding: '1rem 1.25rem',
          fontSize: '0.9rem',
          fontWeight: 500,
        },
        classNames: {
          toast: 'group-[.toaster]:border-l-4 group-[.toaster]:border-l-[#8A2BE2] group-[.toaster]:bg-white group-[.toaster]:shadow-lg',
          description: 'group-[.toaster]:text-gray-500 group-[.toaster]:text-sm group-[.toaster]:mt-1',
          actionButton: 'group-[.toaster]:bg-[#8A2BE2] group-[.toaster]:text-white group-[.toaster]:rounded-lg group-[.toaster]:px-3 group-[.toaster]:py-1.5 group-[.toaster]:text-sm group-[.toaster]:font-medium group-[.toaster]:hover:bg-[#7B1FD1] group-[.toaster]:transition-colors',
          cancelButton: 'group-[.toaster]:bg-gray-100 group-[.toaster]:text-gray-600 group-[.toaster]:rounded-lg group-[.toaster]:px-3 group-[.toaster]:py-1.5 group-[.toaster]:text-sm group-[.toaster]:hover:bg-gray-200 group-[.toaster]:transition-colors',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
