import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SLUG_PATTERN, slugify } from "@/lib/slug";
import type { Result } from "@/services/interests";
import type { AdminInterestGroup } from "@/types/interest";

type Values = { name: string; slug: string; emoji: string; group_id: number | null };
type Field = keyof Values;

const ERRORS: Record<string, { field: Field; message: string }> = {
  invalid_name: { field: "name", message: "Use 1–100 characters." },
  name_taken: { field: "name", message: "This name is already used." },
  invalid_slug: { field: "slug", message: "Use 3–50 lowercase letters, digits or single hyphens." },
  slug_taken: { field: "slug", message: "This slug is already used." },
  invalid_emoji: { field: "emoji", message: "Use one emoji (up to 8 characters)." },
  invalid_group: { field: "group_id", message: "Choose a group." },
};

/** Adds or edits an interest (with `groups`) or a group (without). */
export default function CatalogueDialog({
  title,
  initial,
  groups,
  onClose,
  onSave,
}: {
  title: string;
  initial?: Partial<Values>;
  groups?: AdminInterestGroup[];
  onClose: () => void;
  onSave: (values: Values) => Promise<Result<unknown>>;
}) {
  const isInterest = groups !== undefined;
  const [values, setValues] = useState<Values>({
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    emoji: initial?.emoji ?? "",
    group_id: initial?.group_id ?? null,
  });
  // A new entry's slug follows the name until it's edited by hand.
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [serverError, setServerError] = useState<{ field?: Field; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const errors: Partial<Record<Field, string>> = {};
  const name = values.name.trim();
  if (!name || name.length > 100) errors.name = ERRORS.invalid_name.message;
  if (!SLUG_PATTERN.test(values.slug)) errors.slug = ERRORS.invalid_slug.message;
  if (isInterest) {
    const emoji = values.emoji.trim();
    if (!emoji || [...emoji].length > 8) errors.emoji = ERRORS.invalid_emoji.message;
    if (values.group_id === null) errors.group_id = ERRORS.invalid_group.message;
  }
  const valid = Object.keys(errors).length === 0;

  const set = <K extends Field>(field: K, value: Values[K]) => {
    setServerError(null);
    setValues((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "name" && !slugTouched) next.slug = slugify(value as string);
      return next;
    });
    if (field === "slug") setSlugTouched(true);
  };

  const fieldError = (field: Field) =>
    serverError?.field === field ? serverError.message : touched[field] ? errors[field] : undefined;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, slug: true, emoji: true, group_id: true });
    if (!valid || saving) return;
    setSaving(true);
    const result = await onSave({ ...values, name, emoji: values.emoji.trim() });
    setSaving(false);
    if (result.ok) {
      onClose();
      return;
    }
    setServerError(ERRORS[result.error] ?? { message: "Couldn't save. Please try again." });
  };

  const error = (field: Field) =>
    fieldError(field) && <p className="text-sm text-destructive">{fieldError(field)}</p>;

  const textField = (id: "name" | "slug" | "emoji", label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`catalogue-${id}`}>{label}</Label>
      <Input
        id={`catalogue-${id}`}
        value={values[id]}
        onChange={(e) => set(id, e.target.value)}
        onBlur={() => setTouched((t) => ({ ...t, [id]: true }))}
        aria-invalid={fieldError(id) ? true : undefined}
        {...props}
      />
      {error(id)}
    </div>
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {isInterest ? "Shown to everyone as an emoji and a name, under its group." : "A heading interests are listed under."}
            </DialogDescription>
          </DialogHeader>
          {isInterest ? (
            <div className="grid grid-cols-[5rem_1fr] gap-4">
              {textField("emoji", "Emoji", { placeholder: "💻", className: "text-center text-lg" })}
              {textField("name", "Name", { placeholder: "Technology", autoFocus: true })}
            </div>
          ) : (
            textField("name", "Name", { placeholder: "Technology & Professional", autoFocus: true })
          )}
          {textField("slug", "Slug", { placeholder: isInterest ? "technology" : "technology-professional" })}
          {isInterest && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="catalogue-group">Group</Label>
              <Select
                value={values.group_id === null ? "" : String(values.group_id)}
                onValueChange={(v) => {
                  set("group_id", Number(v));
                  setTouched((t) => ({ ...t, group_id: true }));
                }}
              >
                <SelectTrigger id="catalogue-group" className="w-full" aria-invalid={fieldError("group_id") ? true : undefined}>
                  <SelectValue placeholder="Choose a group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {error("group_id")}
            </div>
          )}
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
