import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SLUG_PATTERN, slugify } from "@/lib/slug";
import type { AdminInterest, InterestInput } from "@/types/interest";
import type { Result } from "@/services/interests";

type Field = keyof InterestInput;

const ERRORS: Record<string, { field: Field; message: string }> = {
  invalid_name: { field: "name", message: "Use 1–100 characters." },
  name_taken: { field: "name", message: "Another interest already has this name." },
  invalid_slug: { field: "slug", message: "Use 3–50 lowercase letters, digits or single hyphens." },
  slug_taken: { field: "slug", message: "Another interest already uses this slug." },
  invalid_emoji: { field: "emoji", message: "Use one emoji (up to 8 characters)." },
};

function localErrors(v: InterestInput): Partial<Record<Field, string>> {
  const e: Partial<Record<Field, string>> = {};
  const name = v.name.trim();
  if (!name || name.length > 100) e.name = ERRORS.invalid_name.message;
  if (!SLUG_PATTERN.test(v.slug)) e.slug = ERRORS.invalid_slug.message;
  const emoji = v.emoji.trim();
  if (!emoji || [...emoji].length > 8) e.emoji = ERRORS.invalid_emoji.message;
  return e;
}

export default function InterestDialog({
  interest,
  onClose,
  onSave,
}: {
  interest: AdminInterest | null;
  onClose: () => void;
  onSave: (input: InterestInput) => Promise<Result<AdminInterest>>;
}) {
  const [values, setValues] = useState<InterestInput>({
    name: interest?.name ?? "",
    slug: interest?.slug ?? "",
    emoji: interest?.emoji ?? "",
  });
  // A new interest's slug follows the name until it's edited by hand.
  const [slugTouched, setSlugTouched] = useState(interest !== null);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [serverError, setServerError] = useState<{ field?: Field; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const errors = localErrors(values);
  const valid = Object.keys(errors).length === 0;

  const set = (field: Field, value: string) => {
    setServerError(null);
    setValues((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "name" && !slugTouched) next.slug = slugify(value);
      return next;
    });
    if (field === "slug") setSlugTouched(true);
  };

  const fieldError = (field: Field) =>
    serverError?.field === field ? serverError.message : touched[field] ? errors[field] : undefined;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, slug: true, emoji: true });
    if (!valid || saving) return;
    setSaving(true);
    const result = await onSave({ name: values.name.trim(), slug: values.slug, emoji: values.emoji.trim() });
    setSaving(false);
    if (result.ok) {
      onClose();
      return;
    }
    const known = ERRORS[result.error];
    setServerError(known ?? { message: "Couldn't save. Please try again." });
  };

  const field = (id: Field, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`interest-${id}`}>{label}</Label>
      <Input
        id={`interest-${id}`}
        value={values[id]}
        onChange={(e) => set(id, e.target.value)}
        onBlur={() => setTouched((t) => ({ ...t, [id]: true }))}
        aria-invalid={fieldError(id) ? true : undefined}
        {...props}
      />
      {fieldError(id) && <p className="text-sm text-destructive">{fieldError(id)}</p>}
    </div>
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{interest ? "Edit interest" : "Add interest"}</DialogTitle>
            <DialogDescription>Shown to everyone as an emoji and a name.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-[5rem_1fr] gap-4">
            {field("emoji", "Emoji", { placeholder: "💻", className: "text-center text-lg" })}
            {field("name", "Name", { placeholder: "Technology", autoFocus: true })}
          </div>
          {field("slug", "Slug", { placeholder: "technology" })}
          {serverError && !serverError.field && (
            <p role="alert" className="text-sm text-destructive">
              {serverError.message}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
