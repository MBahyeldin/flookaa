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
import { interestName } from "@/lib/interests";
import { useTranslation } from "react-i18next";

type Values = { name_en: string; name_ar: string; slug: string; emoji: string; group_id: number | null };
type Field = keyof Values;

const ERROR_FIELDS: Record<string, Field> = {
  invalid_name: "name_en",
  name_taken: "name_en",
  invalid_name_ar: "name_ar",
  name_ar_taken: "name_ar",
  invalid_slug: "slug",
  slug_taken: "slug",
  invalid_emoji: "emoji",
  invalid_group: "group_id",
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
  const { t } = useTranslation(["admin", "common"]);
  const message = (code: string) => t(`dialog.errors.${code}` as "dialog.errors.invalid_name");
  const isInterest = groups !== undefined;
  const [values, setValues] = useState<Values>({
    name_en: initial?.name_en ?? "",
    name_ar: initial?.name_ar ?? "",
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
  const name = values.name_en.trim();
  const nameAr = values.name_ar.trim();
  const emoji = values.emoji.trim();
  if (!name || name.length > 100) errors.name_en = message("invalid_name");
  if (nameAr.length > 100) errors.name_ar = message("invalid_name_ar");
  if (!SLUG_PATTERN.test(values.slug)) errors.slug = message("invalid_slug");
  if (isInterest) {
    if (!emoji || [...emoji].length > 8) errors.emoji = message("invalid_emoji");
    if (values.group_id === null) errors.group_id = message("invalid_group");
  }
  const valid = Object.keys(errors).length === 0;

  const set = <K extends Field>(field: K, value: Values[K]) => {
    setServerError(null);
    setValues((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "name_en" && !slugTouched) next.slug = slugify(value as string);
      return next;
    });
    if (field === "slug") setSlugTouched(true);
  };

  const fieldError = (field: Field) =>
    serverError?.field === field ? serverError.message : touched[field] ? errors[field] : undefined;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name_en: true, name_ar: true, slug: true, emoji: true, group_id: true });
    if (!valid || saving) return;
    setSaving(true);
    const result = await onSave({ ...values, name_en: name, name_ar: nameAr, emoji });
    setSaving(false);
    if (result.ok) {
      onClose();
      return;
    }
    const field = ERROR_FIELDS[result.error];
    setServerError(field ? { field, message: message(result.error) } : { message: t("common:states.saveFailed") });
  };

  const input = (id: "name_en" | "name_ar" | "slug" | "emoji", props: React.ComponentProps<typeof Input> = {}) => (
    <Input
      value={values[id]}
      onChange={(e) => set(id, e.target.value)}
      onBlur={() => setTouched((prev) => ({ ...prev, [id]: true }))}
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
            <DialogTitle>
              {isInterest
                ? adding
                  ? t("interests.addInterest")
                  : t("dialog.editInterest")
                : adding
                  ? t("interests.addGroup")
                  : t("dialog.editGroup")}
            </DialogTitle>
          </DialogHeader>
          {isInterest ? (
            <div className="grid grid-cols-[5rem_1fr] items-start gap-4">
              <FormField label={t("dialog.emoji")} error={fieldError("emoji")}>
                {input("emoji", { placeholder: "💻", className: "text-center text-lg" })}
              </FormField>
              <FormField label={t("dialog.name")} error={fieldError("name_en")}>
                {input("name_en", { placeholder: t("dialog.interestPlaceholder"), dir: "ltr", autoFocus: true })}
              </FormField>
            </div>
          ) : (
            <FormField label={t("dialog.name")} error={fieldError("name_en")}>
              {input("name_en", { placeholder: t("dialog.groupPlaceholder"), dir: "ltr", autoFocus: true })}
            </FormField>
          )}
          <FormField label={t("dialog.nameAr")} helper={t("dialog.nameArHelper")} error={fieldError("name_ar")}>
            {input("name_ar", {
              placeholder: isInterest ? t("dialog.interestPlaceholderAr") : t("dialog.groupPlaceholderAr"),
              dir: "rtl",
              lang: "ar",
            })}
          </FormField>
          <FormField
            label={t("dialog.slug")}
            helper={isInterest ? t("dialog.slugHelperInterest", { slug: slugExample }) : t("dialog.slugHelper")}
            error={fieldError("slug")}
          >
            {input("slug", { placeholder: slugExample })}
          </FormField>
          {isInterest && (
            <Select
              value={values.group_id === null ? "" : String(values.group_id)}
              onValueChange={(v) => {
                set("group_id", Number(v));
                setTouched((prev) => ({ ...prev, group_id: true }));
              }}
            >
              <FormField label={t("dialog.group")} error={fieldError("group_id")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("dialog.chooseGroup")} />
                </SelectTrigger>
              </FormField>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>
                    {interestName(g)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {isInterest && (name || nameAr || emoji) && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">{t("dialog.preview")}</p>
              <div className="flex flex-wrap gap-2">
                <Chip emoji={emoji} dir="ltr">
                  {name || t("dialog.name")}
                </Chip>
                {nameAr && (
                  <Chip emoji={emoji} dir="rtl" lang="ar">
                    {nameAr}
                  </Chip>
                )}
              </div>
            </div>
          )}
          {serverError && !serverError.field && (
            <p role="alert" className="text-sm text-destructive">
              {serverError.message}
            </p>
          )}
          <DialogFooter className="flex-row justify-end gap-2">
            <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>
              {t("common:actions.cancel")}
            </Button>
            <Button type="submit" loading={saving}>
              {adding ? (isInterest ? t("interests.addInterest") : t("interests.addGroup")) : t("common:actions.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
