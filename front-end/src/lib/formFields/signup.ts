import { FormField } from "@/models/Forms/FormField";
import type { FormGroup } from "@/types/FormFields";

const signupFormFields = [
  new FormField({
    id: "first_name",
    label: "First Name",
    type: "text",
    placeholder: "John",
    interfaceType: "text",
    isRequired: true,
    width: "1/2",
  }),
  new FormField({
    id: "last_name",
    label: "Last Name",
    type: "text",
    placeholder: "Doe",
    interfaceType: "text",
    isRequired: true,
    width: "1/2",
  }),
  new FormField({
    id: "email_address",
    label: "Email Address",
    type: "text",
    placeholder: "john@example.com",
    interfaceType: "text",
    isRequired: true,
    width: "1/2",
  }),
  new FormField({
    id: "phone",
    label: "Phone",
    type: "text",
    placeholder: "+1234567890",
    interfaceType: "text",
    isRequired: true,
    width: "1/2",
  }),
  new FormField({
    id: "password",
    label: "Password",
    type: "password",
    placeholder: "********",
    interfaceType: "text",
    isRequired: true,
    width: "1/2",
  }),

  new FormField({
    id: "confirm_password",
    label: "Confirm Password",
    type: "password",
    placeholder: "********",
    interfaceType: "text",
    isRequired: true,
    width: "1/2",
    validate: (value, values) => {
      // custom validation: confirm password matches password
      const passwordField = values?.["password"];
      return value !== passwordField ? "Passwords do not match" : null;
    },
  }),

  new FormField({
    id: "thumbnail",
    label: "Profile Picture",
    type: "text",
    placeholder: "Upload your profile picture",
    interfaceType: "pic",
    isRequired: false,
    width: "full",
  }),
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

export default signupFormFieldsGroups;
