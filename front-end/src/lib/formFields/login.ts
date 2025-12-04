import { FormField } from "@/models/Forms/FormField";
import type { FormGroup } from "@/types/FormFields";

const loginFields = [
  new FormField({
    id: "email_address",
    label: "Email Address",
    type: "text",
    placeholder: "john@example.com",
    interfaceType: "text",
    isRequired: true,
  }),

  new FormField({
    id: "password",
    label: "Password",
    type: "password",
    placeholder: "********",
    interfaceType: "text",
    isRequired: true,
  }),
];

const loginFormFieldsGroups: FormGroup[] = [
  {
    id: "login_group_1",
    label: "Log In Information",
    description: "Enter your email below to login to your account.",
    fields: loginFields,
    sort: 1,
  },
];

export default loginFormFieldsGroups;
