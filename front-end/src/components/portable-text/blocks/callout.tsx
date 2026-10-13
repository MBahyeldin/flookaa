import {
  CircleCheckIcon,
  CircleXIcon,
  HeartIcon,
  InfoIcon,
  LightbulbIcon,
  MegaphoneIcon,
  MessageSquareWarningIcon,
  StarIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from "lucide-react";
import { tv } from "tailwind-variants";
import { z } from "zod";
import { FormField } from "@/models/Forms/FormField";
import { defineBlock } from "./defineBlock";

const MAX_TITLE = 120;

const tones = ["info", "success", "warning", "error"] as const;
const icons = ["info", "check", "alert", "error", "lightbulb", "star", "heart", "megaphone", "none"] as const;

type Tone = (typeof tones)[number];
type Icon = (typeof icons)[number];

const calloutSchema = z.object({
  tone: z.enum(tones).optional(),
  icon: z.enum(icons).optional(),
  title: z
    .string()
    .max(MAX_TITLE)
    .refine((title) => !/[\r\n]/.test(title), "must be one line")
    .optional(),
  description: z.string().refine((text) => text.trim() !== "", "is required"),
});

type CalloutValue = z.infer<typeof calloutSchema>;

const iconComponents: Record<Exclude<Icon, "none">, LucideIcon> = {
  info: InfoIcon,
  check: CircleCheckIcon,
  alert: TriangleAlertIcon,
  error: CircleXIcon,
  lightbulb: LightbulbIcon,
  star: StarIcon,
  heart: HeartIcon,
  megaphone: MegaphoneIcon,
};

const toneIcon: Record<Tone, Icon> = {
  info: "info",
  success: "check",
  warning: "alert",
  error: "error",
};

const calloutStyle = tv({
  slots: {
    box: "flex gap-3 rounded-md border border-s-4 px-4 py-3 text-foreground",
    icon: "mt-0.5 size-5 shrink-0",
  },
  variants: {
    tone: {
      info: { box: "border-primary/30 border-s-primary bg-primary/10", icon: "text-primary" },
      success: { box: "border-success/30 border-s-success bg-success/10", icon: "text-success" },
      warning: { box: "border-warning/30 border-s-warning bg-warning/10", icon: "text-warning" },
      error: { box: "border-destructive/30 border-s-destructive bg-destructive/10", icon: "text-destructive" },
    },
  },
});

const label = (value: string) => value[0].toUpperCase() + value.slice(1);

const calloutFormFields: FormField[] = [
  new FormField({
    id: "tone",
    name: "tone",
    label: "Tone",
    type: "string",
    interfaceType: "select",
    options: tones.map((tone) => ({ label: label(tone), value: tone })),
    width: "full",
  }),
  new FormField({
    id: "icon",
    name: "icon",
    label: "Icon",
    type: "string",
    interfaceType: "select",
    placeholder: "Tone default",
    options: icons.map((icon) => ({ label: label(icon), value: icon })),
    width: "full",
  }),
  new FormField({
    id: "title",
    name: "title",
    label: "Title",
    type: "string",
    interfaceType: "text",
    placeholder: "Optional heading",
    width: "full",
  }),
  new FormField({
    id: "description",
    name: "description",
    label: "Description",
    type: "string",
    interfaceType: "textarea",
    placeholder: "What should readers notice?",
    isRequired: true,
    width: "full",
  }),
];

function CalloutView({ value }: { value: CalloutValue }) {
  const tone = value.tone ?? "info";
  const icon = value.icon ?? toneIcon[tone];
  const Icon = icon === "none" ? null : iconComponents[icon];
  const styles = calloutStyle({ tone });

  return (
    <aside role="note" className={styles.box()}>
      {Icon ? <Icon aria-hidden className={styles.icon()} /> : null}
      <div className="min-w-0 flex-1">
        {value.title ? (
          <p dir="auto" className="font-semibold break-words">
            {value.title}
          </p>
        ) : null}
        <p dir="auto" className="whitespace-pre-wrap break-words">
          {value.description}
        </p>
      </div>
    </aside>
  );
}

export const callout = defineBlock<CalloutValue>({
  name: "callout",
  title: "Callout",
  description: "A highlighted note: info, success, warning or error.",
  icon: MessageSquareWarningIcon,
  category: "layout",
  fields: calloutFormFields,
  defaultValues: { tone: "info" },
  schema: calloutSchema,
  View: CalloutView,
  examples: [
    { tone: "info", title: "Heads up", description: "Comments open once the post is live." },
    { tone: "success", title: "Done", description: "Your channel is ready.\nInvite a few people to start." },
    { tone: "warning", title: "Spoilers ahead", description: "This post discusses the finale." },
    { tone: "error", title: "Not supported", description: "Voice notes can't be edited after posting." },
    { tone: "info", icon: "none", description: "A quiet note without a title or icon." },
  ],
});
