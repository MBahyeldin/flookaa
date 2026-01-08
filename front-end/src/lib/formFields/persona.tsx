import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/models/Forms/FormField";
import type { FormGroup } from "@/types/FormFields";
import { User } from "lucide-react";

const personaFormFields = [
  new FormField({
    id: "name",
    label: "Persona Name",
    type: "text",
    placeholder: "sporty, creative, funny etc.",
    interfaceType: "text",
    isRequired: true,
    width: "1/2",
  }),
  new FormField({
    id: "privacy",
    label: "Privacy Setting",
    type: "select",
    placeholder: "Select privacy setting",
    interfaceType: "select",
    options: [
      { label: "Public", value: "public" },
      { label: "Private", value: "private" },
      { label: "Only Me", value: "only_me" },
    ],
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
