import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/models/Forms/FormField";
import type { FormGroup } from "@/types/FormFields";
import type { Persona } from "@/types/persona";
import { Palette, User } from "lucide-react";
import { SLUG_PATTERN } from "@/lib/slug";


const nameField = new FormField({
    id: "name",
    label: "Persona Name",
    type: "text",
    placeholder: "sporty, creative, funny etc.",
    interfaceType: "text",
    isRequired: true,
    width: "1/2",
  });

const privacyOptions = [
  { label: "Public", value: "public" },
  { label: "Private", value: "private" },
  { label: "Only Me", value: "only_me" },
];

const showOnProfileField = new FormField({
    id: "show_on_profile",
    label: "Show on my profile",
    type: "switch",
    interfaceType: "switch",
    width: "full",
    visibleWhen: (values) => values.privacy === "public",
  });

const personaFormFields = [
  nameField,
  new FormField({
    id: "privacy",
    label: "Privacy Setting",
    type: "select",
    placeholder: "Select privacy setting",
    interfaceType: "select",
    options: privacyOptions,
    isRequired: true,
    width: "1/2",
  }),
  new FormField({
    id: "description",
    label: "Description",
    type: "text",
    placeholder: "Describe your persona",
    interfaceType: "text",
    isRequired: true,
    width: "full",
  }),
  showOnProfileField,
];

const profileFormFields = [
  new FormField({
    id: "thumbnail",
    label: "Profile Picture",
    type: "text",
    placeholder: "Upload your profile picture",
    interfaceType: "profile-picture",
    isRequired: false,
    width: "full",
  }),
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
    id: "bio",
    label: "Bio",
    type: "text",
    placeholder: "Tell us about yourself",
    interfaceType: "textarea",
    isRequired: false,
    width: "full",
  }),
];

const slugField = new FormField({
    id: "slug",
    label: "Slug",
    type: "text",
    placeholder: "quiet-otter",
    interfaceType: "text",
    isRequired: true,
    width: "full",
    hint: (value) => (value ? `Shown as @${value}` : null),
    validate: (value) =>
      typeof value === "string" && value !== "" && !SLUG_PATTERN.test(value)
        ? "Use 3–50 lowercase letters, digits or single hyphens."
        : null,
  });

const themeField = new FormField({
    id: "theme",
    label: "Theme",
    type: "theme",
    interfaceType: "theme",
    width: "full",
  });

export function privacyChangeHint(persona: Persona) {
  return (value: string) => {
    if (value === persona.privacy) return null;
    if (persona.privacy === "public" && persona.show_on_profile) {
      return "It will no longer show on your profile.";
    }
    if (persona.privacy === "private") {
      return "Your follow-request link stops working and your pending invitations are cancelled.";
    }
    return null;
  };
}

export function personaSettingsFormGroups(persona: Persona): FormGroup[] {
  return [
    {
      id: "persona_settings_group_1",
      label: "Persona",
      fields: [
        nameField,
        new FormField({
          id: "privacy",
          label: "Privacy Setting",
          type: "select",
          interfaceType: "select",
          options: privacyOptions,
          isRequired: true,
          width: "1/2",
          hint: privacyChangeHint(persona),
        }),
        new FormField({
          id: "description",
          label: "Description",
          type: "text",
          placeholder: "Describe your persona",
          interfaceType: "text",
          width: "full",
        }),
        showOnProfileField,
        themeField,
      ],
      displayInCard: {
        header: (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Persona
            </CardTitle>
            <CardDescription>Only you see the name and description.</CardDescription>
          </CardHeader>
        ),
      },
    },
    {
      id: "persona_settings_group_2",
      label: "Profile",
      fields: [...profileFormFields.slice(0, 3), slugField, ...profileFormFields.slice(3)],
      displayInCard: {
        header: (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
            <CardDescription>What other personas see.</CardDescription>
          </CardHeader>
        ),
      },
    },
  ];
}

const groupOne: FormGroup = {
    id: "manage_persona_group_1",
    label: "Persona Information",
    description: "Please fill in the details to manage your persona.",
    fields: personaFormFields,
    displayInCard: {
      header: (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Persona Information
          </CardTitle>
          <CardDescription>
            Please fill in the details to manage your persona.
          </CardDescription>
        </CardHeader>
      ),
    },
};

const groupTwo: FormGroup = {
    id: "manage_persona_group_2",
    label: "Profile Information",
    description: "Update your personal profile details.",
    fields: profileFormFields,
    displayInCard: {
      header: (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Please fill in the details to manage your profile.
          </CardDescription>
        </CardHeader>
      ),
    },
};

const personaFormFieldsGroups: FormGroup[] = [
    groupOne,
    groupTwo,
];

export default personaFormFieldsGroups;
