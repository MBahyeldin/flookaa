import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/models/Forms/FormField";
import type { FormGroup } from "@/types/FormFields";
import { CalendarDays, User } from "lucide-react";
import { GENDERS, dateOfBirthSchema } from "@/types/user";

export const dateOfBirthField = new FormField({
  id: "date_of_birth",
  label: "Date of Birth",
  type: "date",
  interfaceType: "text",
  icon: <CalendarDays className="h-4 w-4" />,
  width: "1/2",
  // Once set it can be changed but not removed; untouched null stays valid.
  validate: (value) => {
    if (value == null) return null;
    const result = dateOfBirthSchema.safeParse(value);
    return result.success ? null : result.error.issues[0]?.message ?? "Enter a valid date";
  },
});

const profilePicGroup: FormGroup = {
  id: "profile_picture",
  label: "Profile Picture",
  description: "Upload a profile picture to personalize your account.",
  displayInCard: {
    header: (
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Profile Picture
        </CardTitle>
        <CardDescription>
          Upload a profile picture to personalize your account.
        </CardDescription>
      </CardHeader>
    ),
  },
  fields: [
    new FormField({
      id: "thumbnail",
      label: "Profile Picture",
      type: "file",
      interfaceType: "profile-picture",
      isRequired: false,
    }),
  ],
};

const BasicInfoGroup: FormGroup = {
  id: "basic_info",
  label: "Basic Information",
  description: "Update your personal details and contact information.",
  displayInCard: {
    header: (
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Basic Information
        </CardTitle>
        <CardDescription>
          Update your personal details and contact information.
        </CardDescription>
      </CardHeader>
    ),
  },
  fields: [
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
    dateOfBirthField,
    new FormField({
      id: "gender",
      label: "Gender",
      type: "select",
      interfaceType: "select",
      placeholder: "Select your gender",
      width: "1/2",
      options: GENDERS.map((g) => ({ value: g, label: g === "male" ? "Male" : "Female" })),
    }),
  ],
};

const AddressInfoGroup: FormGroup = {
  id: "address_info",
  label: "Address Information",
  description: "Update your address details.",
  displayInCard: {
    header: (
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Address Information
        </CardTitle>
        <CardDescription>Update your address details.</CardDescription>
      </CardHeader>
    ),
  },
  fields: [
    new FormField({
      id: "country_id",
      label: "Country",
      type: "text",
      placeholder: "Select Country",
      interfaceType: "dropdown-country",
      isRequired: false,
      width: "1/3",
    }),
    new FormField({
      id: "state_id",
      label: "State/Province",
      type: "text",
      placeholder: "Select State",
      interfaceType: "dropdown-state",
      isRequired: false,
      width: "1/3",
    }),
    new FormField({
      id: "city_id",
      label: "City",
      type: "text",
      placeholder: "Select City",
      interfaceType: "dropdown-city",
      isRequired: false,
      width: "1/3",
    }),
  ],
};

const profileFieldsGroups: FormGroup[] = [
  profilePicGroup,
  BasicInfoGroup,
  AddressInfoGroup,
];

export default profileFieldsGroups;
