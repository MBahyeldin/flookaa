import type { FormGroup } from "@/types/FormFields";
import { PASSWORD_RULES_ERROR } from "@/lib/password";
import signupFormFieldsGroup, { forgotPasswordGroups, resetPasswordGroups } from "@/lib/formFields/signup";
import loginFormFieldsGroups from "@/lib/formFields/login";

// An API error code shown on a field instead of under the form; `also` fields are outlined without a message.
type ServerFieldError = { field: string; message: string; also?: string[] };

// Marks a field invalid without a message of its own.
export const MARK_ONLY = "\u0000mark";

export class Form {
  id: string;
  groups: FormGroup[];
  name: string;
  title: string;
  description: string;
  submitText: string;
  relativeApiPath: string;
  method: string;
  serverErrors: Record<string, ServerFieldError>;

  static signup = new Form({
    id: "signup_form",
    name: "Sign Up Form",
    title: "Create Your Account",
    description: "Form for user sign up",
    submitText: "Create account",
    groups: signupFormFieldsGroup,
    relativeApiPath: "/api/v1/auth/register",
    method: "POST",
    serverErrors: {
      weak_password: { field: "password", message: PASSWORD_RULES_ERROR },
      email_taken: { field: "email_address", message: "An account already uses this email. Log in instead." },
    },
  });

  static forgotPassword = new Form({
    id: "forgot_password_form",
    name: "Forgot Password Form",
    title: "Reset your password",
    description: "Sends a reset link to the account's email",
    submitText: "Send link",
    groups: forgotPasswordGroups,
    relativeApiPath: "/api/v1/auth/password/forgot",
    method: "POST",
    serverErrors: {
      invalid_email: { field: "email_address", message: "Enter a valid email address." },
    },
  });

  static resetPassword = new Form({
    id: "reset_password_form",
    name: "Reset Password Form",
    title: "Choose a new password",
    description: "Sets a new password from a reset link",
    submitText: "Change password",
    groups: resetPasswordGroups,
    relativeApiPath: "/api/v1/auth/password/reset",
    method: "POST",
    serverErrors: {
      weak_password: { field: "password", message: PASSWORD_RULES_ERROR },
    },
  });

  static login = new Form({
    id: "login_form",
    name: "Log In Form",
    title: "Welcome Back",
    description: "Enter your email below to login to your account.",
    submitText: "Log in",
    groups: loginFormFieldsGroups,
    relativeApiPath: "/api/v1/auth/login",
    method: "POST",
    serverErrors: {
      "Invalid email or password": { field: "password", message: "Wrong email or password.", also: ["email_address"] },
      "you can't login with password, please use OAuth login": {
        field: "password",
        message: "This account logs in with Google.",
      },
    },
  });

  constructor({
    id,
    name,
    title,
    description,
    submitText,
    relativeApiPath,
    method = "POST",
    groups = [],
    urlPathParams = "",
    serverErrors = {},
  }: {
    id: string;
    name: string;
    title: string;
    description: string;
    submitText: string;
    relativeApiPath: string;
    method?: "POST" | "PUT" | "PATCH";
    groups?: FormGroup[];
    urlPathParams?: string;
    serverErrors?: Record<string, ServerFieldError>;
  }) {
    this.id = id;
    this.name = name;
    this.title = title;
    this.description = description;
    this.submitText = submitText;
    this.groups = groups;
    this.relativeApiPath = relativeApiPath + (urlPathParams || "");
    this.method = method;
    this.serverErrors = serverErrors;
  }

  validate(values: Record<string, unknown>) {
    const errors: Record<string, string> = {};
    Object.values(this.groups).forEach((group) =>
      group.fields.forEach((field) => {
        // required field check
        const value = values[field.id];
        if (field.isRequired && (!value || (Array.isArray(value) && value.length === 0))) {
          errors[field.id] = "This field is required";
        }

        const customValidation = field.validate?.(values[field.id], values);
        if (customValidation) {
          errors[field.id] = customValidation;
        }
      })
    );
    return errors;
  }
}
