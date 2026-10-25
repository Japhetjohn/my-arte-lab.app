import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps extends React.ComponentProps<"textarea"> {
  variant?: "default" | "line" | "boxed";
}

function Textarea({ className, variant = "default", ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        variant === "line"
          ? "w-full bg-transparent border-0 border-b border-[#DADDE1] dark:border-[#2f3032] rounded-none px-0 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 shadow-none outline-none focus-visible:outline-none focus:outline-none focus-visible:ring-0 focus:ring-0 focus:border-[#9747FF] focus-visible:border-[#9747FF] transition-colors disabled:cursor-not-allowed disabled:opacity-50 resize-y aria-invalid:border-red-500"
          : "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
