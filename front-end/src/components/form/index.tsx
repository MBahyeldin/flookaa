import clsx from "clsx";
import FieldRender from "./FieldRender";
import type { Form as FormType } from "@/models/Forms/Form";
import useForm from "@/hooks/useForm";
import { useEffect, useRef, type FormEventHandler } from "react";
import { Card, CardContent } from "../ui/card";

export default function Form({
  form,
  initialValues,
  className,
  changeOpacityWhenSubmitting = false,
  onStatusChange,
  onValuesChange,
  derive,
  children,
}: {
  form: FormType;
  initialValues?: Record<string, unknown>;
  className?: string;
  changeOpacityWhenSubmitting?: boolean;
  onStatusChange: (status: { success: boolean; error: string | null, result: unknown }) => void;
  onValuesChange?: (values: Record<string, unknown>) => void;
  /** Fields to set from the others, e.g. a slug that follows the name until edited. */
  derive?: (values: Record<string, unknown>) => Record<string, unknown> | null;
  children?: React.ReactNode;
}) {
  const {
    status,
    isSubmitting,
    errors,
    touched,
    values,
    handleSubmit,
    handleBlur,
    setFieldValue,
    setTouched,
  } = useForm({
    form,
    initialValues,
  });

  // A hidden field is not submitted, e.g. show_on_profile once privacy isn't public.
  useEffect(() => {
    form.groups
      .flatMap((group) => group.fields)
      .filter((f) => !f.isVisible(values) && values[f.id] !== undefined)
      .forEach((f) => setFieldValue(f.id, undefined));
  }, [form, values, setFieldValue]);

  useEffect(() => {
    onValuesChange?.(values);
  }, [values, onValuesChange]);

  useEffect(() => {
    const patch = derive?.(values);
    if (!patch) return;
    Object.entries(patch)
      .filter(([key, value]) => values[key] !== value)
      .forEach(([key, value]) => setFieldValue(key, value));
  }, [values, derive, setFieldValue]);

  const formRef = useRef<HTMLFormElement>(null);
  // Set by a submit attempt, so errors shown while typing don't move the page.
  const scrollToErrorRef = useRef(false);

  const scrollToFirstError = (fieldErrors: Record<string, unknown>) => {
    const target = Array.from(formRef.current?.querySelectorAll<HTMLElement>("[data-field]") ?? []).find(
      (el) => el.dataset.field && fieldErrors[el.dataset.field]
    );
    const box = target?.firstElementChild as HTMLElement | null | undefined;
    if (!box) return;
    box.scrollIntoView({ behavior: "smooth", block: "center" });
    box.querySelector<HTMLElement>("input, textarea, button, [tabindex]:not([tabindex='-1'])")?.focus({ preventScroll: true });
  };

  // Server errors mapped to a field arrive after the submit.
  useEffect(() => {
    if (!scrollToErrorRef.current || Object.keys(errors).length === 0) return;
    scrollToErrorRef.current = false;
    scrollToFirstError(errors);
  }, [errors]);

  useEffect(() => {
    if (status) {
      // useForm resets status when a submit starts; only an outcome ends the wait.
      if (status.success || status.error) scrollToErrorRef.current = false;
      onStatusChange(status);
    }
  }, [status, onStatusChange]);

  const onSubmit: FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    // mark all fields as touched to show validation errors
    const allFieldIds = form.groups.flatMap((group) =>
      group.fields.map((f) => f.id)
    );
    const validationErrors = await setTouched(
      allFieldIds.reduce((acc, id) => ({ ...acc, [id]: true }), {}),
      true
    );
    // only submit if there are no errors
    if (validationErrors && Object.keys(validationErrors).length > 0) {
      scrollToFirstError(validationErrors);
      return;
    }
    scrollToErrorRef.current = true;
    handleSubmit();
  };

  useEffect(() => {
  }, [errors, touched]);

  return (
    <form
      ref={formRef}
      className={clsx("", className, {
        "opacity-50 pointer-events-none":
          changeOpacityWhenSubmitting && isSubmitting,
      })}
      onSubmit={onSubmit}
    >
      <>
        {form.groups
          .sort((a, b) => (a.sort || 0) - (b.sort || 0))
          .map((group) => {
            return group.displayInCard ? (
              <Card className="mb-8" key={group.id}>
                {group.displayInCard.header}

                <CardContent>
                  <div className="grid grid-cols-12 gap-4 mb-4">
                    {group.fields.map((field) => (
                      <FieldRender
                        key={field.id}
                        field={field}
                        error={errors?.[field.id]}
                        touched={touched?.[field.id]}
                        value={values?.[field.id]}
                        setFieldValue={setFieldValue}
                        handleBlur={handleBlur}
                        values={values}
                        setTouched={setTouched}
                        touchedObject={touched}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              group.fields.map((field) => (
                <FieldRender
                  key={field.id}
                  field={field}
                  error={errors?.[field.id]}
                  touched={touched?.[field.id]}
                  setTouched={setTouched}
                  value={values?.[field.id]}
                  setFieldValue={setFieldValue}
                  handleBlur={handleBlur}
                  values={values}
                />
              ))
            );
          })}

        <div
          className={clsx("col-span-12", { "opacity-50": isSubmitting })}
        >
          {children}
        </div>

        {status && status.error && (
          <p className="text-sm text-destructive mt-1">{status.error}</p>
        )}
      </>
    </form>
  );
}
