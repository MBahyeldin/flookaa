import { FormField } from "@/models/Forms/FormField";
import type { FormGroup } from "@/types/FormFields";
import { passwordError } from "@/lib/password";

export const newPasswordField = new FormField({
  id: "password",
  label: "Password",
  type: "password",
  interfaceType: "text",
  autoComplete: "new-password",
  isRequired: true,
  passwordRules: true,
  validate: passwordError,
});

const signupFormFields = [
  new FormField({
    id: "first_name",
    label: "First name",
    type: "text",
    interfaceType: "text",
    autoComplete: "given-name",
    isRequired: true,
    width: "1/2",
  }),
  new FormField({
    id: "last_name",
    label: "Last name",
    type: "text",
    interfaceType: "text",
    autoComplete: "family-name",
    isRequired: true,
    width: "1/2",
  }),
  new FormField({
    id: "email_address",
    label: "Email",
    type: "email",
    placeholder: "you@example.com",
    interfaceType: "text",
    autoComplete: "email",
    isRequired: true,
    width: "full",
  }),
  newPasswordField,
];

const signupFormFieldsGroups: FormGroup[] = [
  {
    id: "signup_group_1",
    label: "Sign Up Information",
    description: "Please fill in the details to create your account.",
    fields: signupFormFields,
    sort: 1,
  },
];

export const forgotPasswordGroups: FormGroup[] = [
  {
    id: "forgot_password",
    label: "Forgot password",
    description: "The email of your account.",
    fields: [signupFormFields[2]],
    sort: 1,
  },
];

export const resetPasswordGroups: FormGroup[] = [
  {
    id: "reset_password",
    label: "New password",
    description: "Your new password.",
    fields: [newPasswordField],
    sort: 1,
  },
];

export default signupFormFieldsGroups;
