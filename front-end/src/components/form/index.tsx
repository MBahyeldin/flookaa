import clsx from "clsx";
import FieldRender from "./FieldRender";
import type { Form as FormType } from "@/models/Forms/Form";
import useForm from "@/hooks/useForm";
import { useEffect, type FormEventHandler } from "react";
import { Card, CardContent } from "../ui/card";

export default function Form({
  form,
  initialValues,
  className,
  changeOpacityWhenSubmitting = false,
  onStatusChange,
  children,
}: {
  form: FormType;
  initialValues?: Record<string, unknown>;
  className?: string;
  changeOpacityWhenSubmitting?: boolean;
  onStatusChange: (status: { success: boolean; error: string | null, result: unknown }) => void;
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

  useEffect(() => {
    if (status) {
      onStatusChange(status);
    }
  }, [status, onStatusChange]);

  const onSubmit: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    // mark all fields as touched to show validation errors
    const allFieldIds = form.groups.flatMap((group) =>
      group.fields.map((f) => f.id)
    );
    setTouched(
      allFieldIds.reduce((acc, id) => ({ ...acc, [id]: true }), {}),
      true
    );
    // only submit if there are no errors
    if (Object.keys(errors).length === 0) {
      handleSubmit();
    }
  };

  useEffect(() => {
    console.log({ errors, touched });
  }, [errors, touched]);

  return (
    <form
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
          <p className="text-sm text-red-600 mt-1">{status.error}</p>
        )}
      </>
    </form>
  );
}
