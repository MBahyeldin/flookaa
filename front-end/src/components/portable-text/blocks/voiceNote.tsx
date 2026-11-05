import { MicIcon } from "lucide-react";
import { z } from "zod";
import { FormField } from "@/models/Forms/FormField";
import AudioPlayer from "@/components/audio-player";
import { perLanguage, t } from "@/i18n";
import { httpLink, maxChars, oneLine } from "./validation";
import { defineBlock } from "./defineBlock";
import { safeUrl } from "./safeUrl";

const MAX_TITLE = 120;
const MAX_SECONDS = 600;

const voiceNoteSchema = z.object({
  src: z.string().refine((src) => safeUrl(src, ["http", "https"]), httpLink),
  title: z
    .string()
    .refine((title) => title.length <= MAX_TITLE, maxChars(MAX_TITLE))
    .refine((title) => !/[\r\n]/.test(title), oneLine)
    .optional(),
  duration: z.number().int().min(1).max(MAX_SECONDS).optional(),
});

type VoiceNoteValue = z.infer<typeof voiceNoteSchema>;

const voiceNoteFormFields = perLanguage((): FormField[] => [
  new FormField({
    id: "src",
    name: "src",
    label: t("blocks:voiceNote.fields.audio"),
    type: "string",
    interfaceType: "voice",
    isRequired: true,
    duration: "duration",
  }),
  new FormField({
    id: "title",
    name: "title",
    label: t("blocks:voiceNote.fields.title"),
    type: "string",
    interfaceType: "text",
    placeholder: t("blocks:voiceNote.fields.whatItSAboutOptional"),
  }),
  new FormField({ id: "duration", name: "duration", label: t("blocks:voiceNote.fields.duration"), type: "number" }),
]);

function VoiceNoteView({ value }: { value: VoiceNoteValue }) {
  return <AudioPlayer src={value.src} initialDuration={value.duration} title={value.title} variant="pill" />;
}

export const voiceNote = defineBlock<VoiceNoteValue>({
  name: "voiceNote",
  get title() {
    return t("blocks:voiceNote.title");
  },
  get description() {
    return t("blocks:voiceNote.description");
  },
  icon: MicIcon,
  category: "media",
  get fields() {
    return voiceNoteFormFields();
  },
  defaultValues: {},
  schema: voiceNoteSchema,
  View: VoiceNoteView,
  summary: (value) =>
    value.duration
      ? t("blocks:voiceNote.summary", {
          time: `${Math.floor(value.duration / 60)}:${String(value.duration % 60).padStart(2, "0")}`,
        })
      : t("blocks:voiceNote.title"),
  fromForm: (form) => {
    const { title, duration, ...rest } = form;
    return {
      ...rest,
      ...(typeof title === "string" && title.trim() !== "" ? { title } : {}),
      ...(typeof duration === "number" ? { duration } : {}),
    } as VoiceNoteValue;
  },
  examples: [
    { src: "/sample-voice.m4a", title: "A quick hello", duration: 3 },
    { src: "/sample-voice.m4a", duration: 3 },
  ],
});
