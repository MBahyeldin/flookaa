import type { FormEvent, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SettingsSection({
  id,
  title,
  lead,
  action,
  note,
  onSave,
  dirty = false,
  saving = false,
  canSave = true,
  saveLabel = "Save",
  className,
  children,
}: {
  id?: string;
  title: ReactNode;
  lead?: ReactNode;
  /** A control beside the title, for sections that apply at once. */
  action?: ReactNode;
  /** Left of Save, e.g. a count. */
  note?: ReactNode;
  onSave?: () => unknown;
  dirty?: boolean;
  saving?: boolean;
  canSave?: boolean;
  saveLabel?: string;
  className?: string;
  children?: ReactNode;
}) {
  const headingId = id ? `${id}-title` : undefined;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (dirty && canSave && !saving) void onSave?.();
  };

  const body = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={headingId} className="text-h4 font-semibold">
            {title}
          </h2>
          {lead && <div className="text-sm text-muted-foreground">{lead}</div>}
        </div>
        {action}
      </div>
      {children}
      {onSave && (
        <div className="flex items-center justify-end gap-3">
          {note && <div className="mr-auto text-sm text-muted-foreground">{note}</div>}
          <Button type="submit" loading={saving} disabled={!dirty || !canSave}>
            {saveLabel}
          </Button>
        </div>
      )}
    </>
  );

  const classes = cn("flex scroll-mt-32 flex-col gap-5 rounded-lg border bg-card p-4 text-card-foreground md:p-6", className);
  return onSave ? (
    <form id={id} aria-labelledby={headingId} onSubmit={submit} className={classes} noValidate>
      {body}
    </form>
  ) : (
    <section id={id} aria-labelledby={headingId} className={classes}>
      {body}
    </section>
  );
}
