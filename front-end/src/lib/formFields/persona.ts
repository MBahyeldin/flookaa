import { FormField } from "@/models/Forms/FormField";
import type { FormGroup } from "@/types/FormFields";

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
    id: "description",
    label: "Description",
    type: "text",
    placeholder: "Describe your persona",
    interfaceType: "text",
    isRequired: true,
    width: "1/2",
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

const personaFormFieldsGroups: FormGroup[] = [
  {
    id: "persona_group_1",
    label: "Persona Information",
    description: "Please fill in the details to create your persona.",
    fields: personaFormFields,
    sort: 1,
  },
];

export default personaFormFieldsGroups;
