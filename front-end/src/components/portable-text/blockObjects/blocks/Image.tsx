import { Image, LinkIcon, PencilIcon } from "lucide-react";
import BlockObject from "../BlockObject";
import { FormField } from "@/models/Forms/FormField";
import { tv } from "tailwind-variants";
import { cn } from "@/lib/utils";

export type ImageValue = {
  src: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
};

const imageFormFields: FormField[] = [
  new FormField({
    id: "src",
    name: "src",
    label: "Image URL",
    type: "string",
    interfaceType: "pic",
    placeholder: "https://example.com/jpg",
    isRequired: true,
    width: "full",
  }),
  new FormField({
    id: "alt",
    name: "alt",
    label: "Alt Text",
    type: "string",
    interfaceType: "text",
    placeholder: "A description of the image for accessibility",
    isRequired: false,
    width: "full",
  }),
  new FormField({
    id: "caption",
    name: "caption",
    label: "Caption",
    type: "string",
    interfaceType: "text",
    placeholder: "Caption for the image (optional)",
    isRequired: false,
    width: "full",
  }),
  new FormField({
    id: "width",
    name: "width",
    label: "Width (px)",
    type: "number",
    interfaceType: "number",
    placeholder: "Width in pixels (optional)",
    isRequired: false,
    width: "1/2",
    validate: (value) => {
      if (value !== undefined && (isNaN(Number(value)) || Number(value) <= 0)) {
        return "Width must be a positive number";
      }
      return null;
    },
  }),
  new FormField({
    id: "height",
    name: "height",
    label: "Height (px)",
    type: "number",
    interfaceType: "number",
    placeholder: "Height in pixels (optional)",
    isRequired: false,
    width: "1/2",
    validate: (value) => {
      if (value !== undefined && (isNaN(Number(value)) || Number(value) <= 0)) {
        return "Height must be a positive number";
      }
      return null;
    },
  }),
];

// name, type, options
const ImageBlockObject = new BlockObject<ImageValue>({
  name: "image",
  title: "Image",
  icon: <Image className="h-5 w-5" />,
  options: { hotspot: true },
  fields: imageFormFields,
  renderBlock: renderBlock,
});

const imageStyle = tv({
  base: "grid grid-cols-[auto_1fr] my-1 items-start gap-1 border-2 border-gray-300 rounded text-sm",
  variants: {
    selected: {
      true: "border-blue-300",
    },
    focused: {
      true: "bg-blue-50",
    },
  },
});

function renderBlock(props: {
  value: ImageValue;
  selected?: boolean;
  focused?: boolean;
}) {
  const { value } = props;
  console.log("value in image block:", value);

  if (!value || !value.src) {
    return null;
  }
  return (
    <div>
      <div className={cn("")}>
        <img className="max-w-full" src={value.src} alt={value.alt ?? ""} />
      </div>
      <span className="">{value.caption}</span>
    </div>
  );
}

export default ImageBlockObject;
