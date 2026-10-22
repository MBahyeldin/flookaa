import * as React from "react"
import { CircleAlert, type LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { StateBox } from "@/components/ui/empty-state"

function ErrorState({
  icon = CircleAlert,
  title,
  body = "Check your connection and try again.",
  onRetry,
  compact,
  className,
}: {
  icon?: LucideIcon
  title: React.ReactNode
  body?: React.ReactNode
  onRetry?: () => unknown
  compact?: boolean
  className?: string
}) {
  const [retrying, setRetrying] = React.useState(false)
  const retry = async () => {
    setRetrying(true)
    try {
      await onRetry?.()
    } finally {
      setRetrying(false)
    }
  }
  return (
    <StateBox
      data-slot="error-state"
      role="alert"
      icon={icon}
      iconClassName="text-destructive"
      title={title}
      body={body}
      compact={compact}
      className={className}
      action={
        onRetry && (
          <Button variant="outline" loading={retrying} onClick={retry}>
            Try again
          </Button>
        )
      }
    />
  )
}

export { ErrorState }
