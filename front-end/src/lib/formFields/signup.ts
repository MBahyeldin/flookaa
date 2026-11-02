import { t } from "@/i18n";
import { FormField } from "@/models/Forms/FormField";
import type { FormGroup } from "@/types/FormFields";
import { passwordError } from "@/lib/password";

function newPasswordField() {
  return new FormField({
    id: "password",
    label: t("auth:fields.password"),
    type: "password",
    interfaceType: "text",
    autoComplete: "new-password",
    isRequired: true,
    passwordRules: true,
    validate: passwordError,
  });
}

function emailField() {
  return new FormField({
    id: "email_address",
    label: t("auth:fields.email"),
    type: "email",
    placeholder: t("auth:fields.emailPlaceholder"),
    interfaceType: "text",
    autoComplete: "email",
    isRequired: true,
    width: "full",
  });
}

export default function signupFormFieldsGroups(): FormGroup[] {
  return [
    {
      id: "signup_group_1",
      label: t("auth:signup.title"),
      fields: [
        new FormField({
          id: "first_name",
          label: t("auth:fields.firstName"),
          type: "text",
          interfaceType: "text",
          autoComplete: "given-name",
          isRequired: true,
          width: "1/2",
        }),
        new FormField({
          id: "last_name",
          label: t("auth:fields.lastName"),
          type: "text",
          interfaceType: "text",
          autoComplete: "family-name",
          isRequired: true,
          width: "1/2",
        }),
        emailField(),
        newPasswordField(),
      ],
      sort: 1,
    },
  ];
}

export function forgotPasswordGroups(): FormGroup[] {
  return [{ id: "forgot_password", label: t("auth:forgot.title"), fields: [emailField()], sort: 1 }];
}

export function resetPasswordGroups(): FormGroup[] {
  return [{ id: "reset_password", label: t("auth:reset.title"), fields: [newPasswordField()], sort: 1 }];
}
