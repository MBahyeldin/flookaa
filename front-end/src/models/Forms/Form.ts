import type { FormGroup } from "@/types/FormFields";
import { MIN_AGE_ERROR } from "@/lib/minAge";
import { PASSWORD_RULES_ERROR } from "@/lib/password";
import signupFormFieldsGroup, { forgotPasswordGroups, resetPasswordGroups } from "@/lib/formFields/signup";
import profileFieldsGroups from "@/lib/formFields/profile";
import loginFormFieldsGroups from "@/lib/formFields/login";
import channelFormFieldsGroups from "@/lib/formFields/channel";
import communityFormFieldsGroups from "@/lib/formFields/community";
import personaFormFieldsGroups, { personaSettingsFormGroups } from "@/lib/formFields/persona";
import type { Persona } from "@/types/persona";

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

  static profile = new Form({
    id: "profile_form",
    name: "Profile Form",
    title: "Update Your Profile",
    description: "Form to update user profile information",
    submitText: "Save Changes",
    groups: profileFieldsGroups,
    relativeApiPath: "/api/v1/users/profile",
    method: "PATCH",
    serverErrors: {
      invalid_date_of_birth: { field: "date_of_birth", message: "Enter a date between 1900 and today" },
      invalid_gender: { field: "gender", message: "Choose one" },
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

  static channel = new Form({
    id: "channel_form",
    name: "Channel Form",
    title: "Create Your Channel",
    description: "Form for creating a new channel",
    submitText: "Create Channel",
    groups: channelFormFieldsGroups,
    relativeApiPath: "/api/v1/channels/create",
    method: "POST",
    serverErrors: {
      invalid_interests: { field: "interest_ids", message: "Pick 1 to 5 interests." },
      invalid_interest: { field: "interest_ids", message: "One of these interests is no longer offered." },
      invalid_min_age: { field: "min_age", message: MIN_AGE_ERROR },
    },
  });

  static persona = new Form({
    id: "persona_form",
    name: "Persona Form",
    title: "Create Your Persona",
    description: "Form for creating a new persona",
    submitText: "Create Persona",
    groups: personaFormFieldsGroups,
    relativeApiPath: "/api/v1/persona/create",
    method: "POST",
  });

  static community(communityId?: number, canOwn = true) {
    return new Form({
      id: "community_form",
      name: "Community Form",
      title: communityId ? "Edit community" : "Create a community",
      description: "A community groups channels about the same topics.",
      submitText: communityId ? "Save changes" : "Create community",
      groups: communityFormFieldsGroups(canOwn),
      relativeApiPath: communityId ? `/api/v1/communities/${communityId}` : "/api/v1/communities/create",
      method: communityId ? "PATCH" : "POST",
      serverErrors: {
        invalid_name: { field: "name", message: "Enter a name of at most 100 characters." },
        invalid_rules: { field: "rules", message: "Use at most 5000 characters." },
        invalid_slug: { field: "slug", message: "Use 3–50 lowercase letters, digits or single hyphens." },
        slug_taken: { field: "slug", message: "Another community already uses this link." },
        invalid_interests: { field: "interest_ids", message: "Pick 1 to 5 interests." },
        invalid_interest: { field: "interest_ids", message: "One of these interests is no longer offered." },
        invalid_min_age: { field: "min_age", message: MIN_AGE_ERROR },
      },
    });
  }

  static personaSettings(persona: Persona) {
    return new Form({
      id: "persona_settings_form",
      name: "Persona Settings Form",
      title: "Persona settings",
      description: "Form for editing one of your personas",
      submitText: "Save changes",
      groups: personaSettingsFormGroups(persona),
      relativeApiPath: `/api/v1/persona/update/${persona.id}`,
      method: "POST",
      serverErrors: {
        invalid_slug: { field: "slug", message: "Use 3–50 lowercase letters, digits or single hyphens." },
        slug_taken: { field: "slug", message: "Another of your personas already uses this slug." },
        invalid_theme: { field: "theme", message: "Pick one of the palettes." },
      },
    });
  }

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
