import {
  CheckCircle2,
  InfoIcon,
  Loader2Icon,
  TriangleAlertIcon,
  XCircle,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
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
