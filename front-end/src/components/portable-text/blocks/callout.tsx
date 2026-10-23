import {
  CheckIcon,
  CircleAlertIcon,
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
const MAX_TAG = 24;

const tones = ["info", "success", "warning", "error"] as const;
const icons = ["info", "check", "alert", "error", "lightbulb", "star", "heart", "megaphone", "none"] as const;

type Tone = (typeof tones)[number];
type Icon = (typeof icons)[number];

const calloutSchema = z.object({
  tone: z.enum(tones).optional(),
  icon: z.enum(icons).optional(),
  tag: z
    .string()
    .max(MAX_TAG)
    .refine((tag) => !/[\r\n]/.test(tag), "must be one line")
    .optional(),
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
  check: CheckIcon,
  alert: TriangleAlertIcon,
  error: CircleAlertIcon,
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

const toneTag: Record<Tone, string> = {
  info: "Good to know",
  success: "Nice!",
  warning: "Heads up",
  error: "Careful",
};

const calloutStyle = tv({
  slots: {
    box: "relative flex items-start gap-4 rounded-2xl bg-card px-5 pt-[22px] pb-5 text-foreground",
    tint: "absolute inset-0 rounded-2xl opacity-12",
    badge: "relative flex size-11 shrink-0 items-center justify-center rounded-full",
    tag: "max-w-full origin-center  truncate rounded-full px-2.5 py-1 text-xs leading-[1.4] font-medium rtl:rotate-3",
  },
  variants: {
    tone: {
      info: { tint: "bg-primary", badge: "bg-primary text-primary-foreground", tag: "bg-primary text-primary-foreground" },
      success: { tint: "bg-success", badge: "bg-success text-success-foreground", tag: "bg-success text-success-foreground" },
      warning: { tint: "bg-warning", badge: "bg-warning text-warning-foreground", tag: "bg-warning text-warning-foreground" },
      error: {
        tint: "bg-destructive",
        badge: "bg-destructive text-destructive-foreground",
        tag: "bg-destructive text-destructive-foreground",
      },
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
    id: "tag",
    name: "tag",
    label: "Tag",
    type: "string",
    interfaceType: "text",
    placeholder: "Tone default, e.g. Heads up",
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
  const tag = value.tag?.trim() ? value.tag : toneTag[tone];
  const styles = calloutStyle({ tone });

  return (
    <aside role="note" className={styles.box()}>
      <span aria-hidden className={styles.tint()} />
      {Icon ? (
        <span aria-hidden className={styles.badge()}>
          <Icon className="size-[22px]" />
        </span>
      ) : null}
      <div className="relative flex min-w-0 flex-1 flex-col items-start gap-1.5">
        <span dir="auto" className={styles.tag()}>
          {tag}
        </span>
        {value.title ? (
          <p dir="auto" className="w-full font-medium leading-[1.6] break-words">
            {value.title}
          </p>
        ) : null}
        <p dir="auto" className="w-full text-sm leading-normal whitespace-pre-wrap break-words">
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
    { tone: "info", title: "Training moves to the grass pitch", description: "From Friday we train on pitch 2. Bring boots with studs." },
    { tone: "success", title: "Registration is open", description: "42 of 60 spots left for the spring league." },
    { tone: "warning", tag: "Schedule", title: "Kick-off moved to 18:30", description: "The earlier slot clashed with the youth final." },
    { tone: "error", title: "Payment link expired", description: "Ask Rami for a new one before Thursday." },
    { tone: "info", icon: "none", description: "A quiet note without a title or icon." },
  ],
});
