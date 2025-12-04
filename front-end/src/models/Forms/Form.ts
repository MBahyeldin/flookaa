import type { FormGroup } from "@/types/FormFields";
import signupFormFieldsGroup from "@/lib/formFields/signup";
import profileFieldsGroups from "@/lib/formFields/profile";
import loginFormFieldsGroups from "@/lib/formFields/login";
import channelFormFieldsGroups from "@/lib/formFields/channel";

export class Form {
  id: string;
  groups: FormGroup[];
  name: string;
  title: string;
  description: string;
  submitText: string;
  relativeApiPath: string;
  method: string;

  static signup = new Form({
    id: "signup_form",
    name: "Sign Up Form",
    title: "Create Your Account",
    description: "Form for user sign up",
    submitText: "Signup",
    groups: signupFormFieldsGroup,
    relativeApiPath: "/api/v1/auth/register",
    method: "POST",
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
  });

  static login = new Form({
    id: "login_form",
    name: "Log In Form",
    title: "Welcome Back",
    description: "Enter your email below to login to your account.",
    submitText: "Log In",
    groups: loginFormFieldsGroups,
    relativeApiPath: "/api/v1/auth/login",
    method: "POST",
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
  }: {
    id: string;
    name: string;
    title: string;
    description: string;
    submitText: string;
    relativeApiPath: string;
    method?: "POST" | "PUT" | "PATCH";
    groups?: FormGroup[];
  }) {
    this.id = id;
    this.name = name;
    this.title = title;
    this.description = description;
    this.submitText = submitText;
    this.groups = groups;
    this.relativeApiPath = relativeApiPath;
    this.method = method;
  }

  validate(values: Record<string, unknown>) {
    const errors: Record<string, string> = {};
    Object.values(this.groups).forEach((group) =>
      group.fields.forEach((field) => {
        // required field check
        if (field.isRequired && !values[field.id]) {
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
