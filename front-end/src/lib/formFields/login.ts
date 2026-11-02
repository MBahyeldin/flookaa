import { t } from "@/i18n";
import { FormField } from "@/models/Forms/FormField";
import type { FormGroup } from "@/types/FormFields";

export default function loginFormFieldsGroups(): FormGroup[] {
  return [
    {
      id: "login_group_1",
      label: t("auth:login.title"),
      fields: [
        new FormField({
          id: "email_address",
          label: t("auth:fields.email"),
          type: "email",
          placeholder: t("auth:fields.emailPlaceholder"),
          interfaceType: "text",
          autoComplete: "email",
          isRequired: true,
        }),
        new FormField({
          id: "password",
          label: t("auth:fields.password"),
          type: "password",
          interfaceType: "text",
          autoComplete: "current-password",
          isRequired: true,
        }),
      ],
      sort: 1,
    },
  ];
}
