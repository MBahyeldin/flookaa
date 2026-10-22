import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-28 placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground bg-card border-input w-full min-w-0 rounded-md border px-3 py-2.5 text-base transition-[color,border-color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring aria-invalid:border-destructive aria-invalid:ring-[0.5px] aria-invalid:ring-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
