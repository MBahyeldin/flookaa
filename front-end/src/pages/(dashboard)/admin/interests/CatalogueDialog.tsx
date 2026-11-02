import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
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
  adding,
  initial,
  groups,
  onClose,
  onSave,
}: {
  adding: boolean;
  initial?: Partial<Values>;
  groups?: AdminInterestGroup[];
  onClose: () => void;
  onSave: (values: Values) => Promise<Result<unknown>>;
}) {
  const isInterest = groups !== undefined;
  const noun = isInterest ? "interest" : "group";
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
  const emoji = values.emoji.trim();
  if (!name || name.length > 100) errors.name = ERRORS.invalid_name.message;
  if (!SLUG_PATTERN.test(values.slug)) errors.slug = ERRORS.invalid_slug.message;
  if (isInterest) {
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
    const result = await onSave({ ...values, name, emoji });
    setSaving(false);
    if (result.ok) {
      onClose();
      return;
    }
    setServerError(ERRORS[result.error] ?? { message: "Couldn't save. Please try again." });
  };

  const input = (id: "name" | "slug" | "emoji", props: React.ComponentProps<typeof Input> = {}) => (
    <Input
      value={values[id]}
      onChange={(e) => set(id, e.target.value)}
      onBlur={() => setTouched((t) => ({ ...t, [id]: true }))}
      {...props}
    />
  );

  const slugExample = values.slug || (isInterest ? "technology" : "technology-professional");

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent
        aria-describedby={undefined}
        className="max-sm:top-auto max-sm:bottom-0 max-sm:max-w-full max-sm:translate-y-0 max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0 sm:max-w-[480px]">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader className="text-left">
            <DialogTitle>{adding ? `Add ${noun}` : `Edit ${noun}`}</DialogTitle>
          </DialogHeader>
          {isInterest ? (
            <div className="grid grid-cols-[5rem_1fr] items-start gap-4">
              <FormField label="Emoji" error={fieldError("emoji")}>
                {input("emoji", { placeholder: "💻", className: "text-center text-lg" })}
              </FormField>
              <FormField label="Name" error={fieldError("name")}>
                {input("name", { placeholder: "Technology", autoFocus: true })}
              </FormField>
            </div>
          ) : (
            <FormField label="Name" error={fieldError("name")}>
              {input("name", { placeholder: "Technology & Professional", autoFocus: true })}
            </FormField>
          )}
          <FormField
            label="Slug"
            helper={isInterest ? `Used in links, e.g. ?interest=${slugExample}` : "Used in links"}
            error={fieldError("slug")}
          >
            {input("slug", { placeholder: slugExample })}
          </FormField>
          {isInterest && (
            <Select
              value={values.group_id === null ? "" : String(values.group_id)}
              onValueChange={(v) => {
                set("group_id", Number(v));
                setTouched((t) => ({ ...t, group_id: true }));
              }}
            >
              <FormField label="Group" error={fieldError("group_id")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a group" />
                </SelectTrigger>
              </FormField>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {isInterest && (name || emoji) && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">How people see it</p>
              <Chip emoji={emoji} className="self-start">
                {name || "Name"}
              </Chip>
            </div>
          )}
          {serverError && !serverError.field && (
            <p role="alert" className="text-sm text-destructive">
              {serverError.message}
            </p>
          )}
          <DialogFooter className="flex-row justify-end gap-2">
            <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {adding ? `Add ${noun}` : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
