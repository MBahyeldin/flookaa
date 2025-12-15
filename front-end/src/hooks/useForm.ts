import type { Form } from "@/models/Forms/Form";
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
    onSubmit: async (values, { setStatus }) => {
      console.log({ submittingValues: values });

      try {
        setStatus({ success: false, error: null });
        console.log("submitting", values);

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

        console.log("data to submit", data);

        if (Object.keys(data).length === 0) {
          console.log("no changes to submit");

          setStatus({ success: true });
          return;
        }

        const resp = await fetch(`${API_BASE_URL}${form.relativeApiPath}`, {
          method: form.method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
        if (!resp.ok) {
          const errorData = await resp.json();
          throw new Error(errorData.error || "Failed to submit form");
        }
        setStatus({ success: true, error: null, result: await resp.json() });
      } catch (error) {
        console.log("u", error);

        setStatus({
          error: error instanceof Error ? error.message : String(error),
        });
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
