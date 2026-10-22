import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

function FormField({
  label,
  helper,
  error,
  className,
  children,
}: {
  label: React.ReactNode
  helper?: React.ReactNode
  error?: React.ReactNode
  className?: string
  children: React.ReactElement
}) {
  const id = React.useId()
  const noteId = `${id}-note`
  const note = error || helper

  return (
    <div data-slot="form-field" className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Slot id={id} aria-invalid={error ? true : undefined} aria-describedby={note ? noteId : undefined}>
        {children}
      </Slot>
      {note && (
        <p
          id={noteId}
          role={error ? "alert" : undefined}
          className={cn("text-xs", error ? "text-destructive" : "text-muted-foreground")}
        >
          {note}
        </p>
      )}
    </div>
  )
}

export { FormField }
