import { apiFetch } from "@/lib/apiFetch";
import { MARK_ONLY, type Form } from "@/models/Forms/Form";
import { useFormik } from "formik";
import { unknown } from "zod";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error("API_BASE_URL is not defined");
}

export default function useForm({
  form,
  initialValues = {},
}: {
  form: Form;
  initialValues?: Record<string, unknown>;
}) {
  const {
    errors,
    setFieldValue,
    handleBlur,
    handleSubmit,
    status,
    touched,
    setTouched,
    isSubmitting,
    values,
  } = useFormik({
    initialValues,
    validate: form.validate.bind(form),
    initialStatus: { success: false, error: null, result: unknown },
    onSubmit: async (values, { setStatus, setFieldError }) => {

      try {
        setStatus({ success: false, error: null });

        // await new Promise((resolve) => setTimeout(resolve, 2000));

        if (!form.relativeApiPath) {
          throw new Error("API path is not defined");
        }

        if (!form.relativeApiPath.startsWith("/")) {
          throw new Error("API path must start with '/'");
        }

        let data = { ...values };

        if (form.method === "PATCH") {
          data = Object.entries(initialValues).reduce((acc, [key, value]) => {
            if (values[key] !== value) {
              acc[key] = values[key];
            }
            return acc;
          }, {} as Record<string, unknown>);
        }


        form.groups
          .flatMap((group) => group.fields)
          .forEach((f) => {
            if (f.serialize && f.id in data) data[f.id] = f.serialize(data[f.id]);
          });

        if (Object.keys(data).length === 0) {

          setStatus({ success: true });
          return;
        }

        const resp = await apiFetch(`${API_BASE_URL}${form.relativeApiPath}`, {
          method: form.method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
          credentials: "include",
        });
        if (!resp.ok) {
          const errorData = await resp.json();
          throw new Error(errorData.error || "Failed to submit form");
        }
        setStatus({ success: true, error: null, result: await resp.json() });
      } catch (error) {
        console.error("Form submission failed:", error);

        const message = error instanceof Error ? error.message : String(error);
        const fieldError = form.serverErrors[message];
        if (fieldError) {
          setFieldError(fieldError.field, fieldError.message);
          fieldError.also?.forEach((f) => setFieldError(f, MARK_ONLY));
          setStatus({ success: false, error: null });
          return;
        }
        setStatus({ error: message });
      }
    },
  });

  return {
    status,
    isSubmitting,
    form,
    errors,
    touched,
    values,
    handleSubmit,
    handleBlur,
    setFieldValue,
    setTouched,
  };
}
