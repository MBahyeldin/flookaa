import type { FormEvent, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

// Form on the left, preview sticky on the right from lg; below lg the preview sits on top and scrolls away.
export function CreatePage({
  title,
  lead,
  backTo,
  preview,
  onSubmit,
  submitting,
  submitLabel,
  children,
}: {
  title: ReactNode;
  lead?: ReactNode;
  /** Where Back and Cancel go when there's no history to return to. */
  backTo: string;
  preview: ReactNode;
  onSubmit: () => unknown;
  submitting: boolean;
  submitLabel: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const back = () => (location.key !== "default" ? navigate(-1) : navigate(backTo));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!submitting) void onSubmit();
  };

  return (
    <div className="mx-auto grid w-full max-w-[1110px] gap-6 px-4 py-8 md:py-12 lg:grid-cols-[minmax(0,640px)_390px] lg:gap-x-10 lg:px-8">
      <div className="flex items-start gap-3">
        <Button type="button" variant="ghost" size="icon-sm" onClick={back} aria-label="Back" className="mt-1.5 shrink-0">
          <ArrowLeft />
        </Button>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-h1 font-semibold tracking-tight">{title}</h1>
          {lead && <p className="text-sm text-muted-foreground">{lead}</p>}
        </div>
      </div>

      <aside aria-label="Preview" className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <div className="flex flex-col gap-3 lg:sticky lg:top-8">
          <p className="text-overline font-semibold uppercase text-muted-foreground">Preview</p>
          {preview}
          <p className="hidden text-xs text-muted-foreground lg:block">Stays in view while the form scrolls.</p>
        </div>
      </aside>

      <form onSubmit={submit} noValidate className="flex min-w-0 flex-col gap-6">
        {children}
        <div className="flex gap-3 md:justify-end">
          <Button type="button" variant="ghost" onClick={back} className="flex-1 md:flex-none">
            Cancel
          </Button>
          <Button type="submit" loading={submitting} className="flex-1 md:flex-none">
            {submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
