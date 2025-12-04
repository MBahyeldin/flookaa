import { FormField } from "@/models/Forms/FormField";
import type { FormGroup } from "@/types/FormFields";

//
// type CreateChannelRequest struct {
// 	Name        string `json:"name" binding:"required"`
// 	Description string `json:"description"`
// 	Thumbnail   string `json:"thumbnail"`
// 	Banner      string `json:"banner"`
// }

const channelFormFields = [
  new FormField({
    id: "name",
    label: "Channel Name",
    type: "text",
    placeholder: "Enter channel name",
    interfaceType: "text",
    isRequired: true,
    width: "1/2",
  }),
  new FormField({
    id: "description",
    label: "Description",
    type: "textarea",
    placeholder: "Enter channel description",
    interfaceType: "text",
    isRequired: true,
    width: "1/2",
  }),
  new FormField({
    id: "thumbnail",
    label: "Thumbnail",
    type: "text",
    placeholder: "Enter thumbnail URL",
    interfaceType: "pic",
    isRequired: true,
    width: "1/2",
    height: "h-32",
  }),
  new FormField({
    id: "banner",
    label: "Banner",
    type: "text",
    placeholder: "Enter banner URL",
    interfaceType: "pic",
    isRequired: true,
    width: "1/2",
    height: "h-32",
  }),
];

const channelFormFieldsGroups: FormGroup[] = [
  {
    id: "channel_group_1",
    label: "Channel Information",
    description: "Please fill in the details to create your channel.",
    fields: channelFormFields,
    sort: 1,
  },
];

export default channelFormFieldsGroups;
