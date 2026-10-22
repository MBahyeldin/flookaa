import { MicIcon } from "lucide-react";
import { z } from "zod";
import { FormField } from "@/models/Forms/FormField";
import AudioPlayer from "@/components/audio-player";
import { defineBlock } from "./defineBlock";
import { safeUrl } from "./safeUrl";

const MAX_TITLE = 120;
const MAX_SECONDS = 600;

const voiceNoteSchema = z.object({
  src: z.string().refine((src) => safeUrl(src, ["http", "https"]), "must be an http(s) link"),
  title: z
    .string()
    .refine((title) => title.length <= MAX_TITLE, `must be at most ${MAX_TITLE} characters`)
    .refine((title) => !/[\r\n]/.test(title), "must be one line")
    .optional(),
  duration: z.number().int().min(1).max(MAX_SECONDS).optional(),
});

type VoiceNoteValue = z.infer<typeof voiceNoteSchema>;

const voiceNoteFormFields: FormField[] = [
  new FormField({
    id: "src",
    name: "src",
    label: "Audio",
    type: "string",
    interfaceType: "voice",
    isRequired: true,
    duration: "duration",
  }),
  new FormField({
    id: "title",
    name: "title",
    label: "Title",
    type: "string",
    interfaceType: "text",
    placeholder: "What it's about (optional)",
  }),
  new FormField({ id: "duration", name: "duration", label: "Duration", type: "number" }),
];

function VoiceNoteView({ value }: { value: VoiceNoteValue }) {
  return (
    <div className="flex flex-col gap-2">
      {value.title ? (
        <p dir="auto" className="text-sm font-medium break-words text-foreground">
          {value.title}
        </p>
      ) : null}
      <AudioPlayer src={value.src} initialDuration={value.duration} />
    </div>
  );
}

export const voiceNote = defineBlock<VoiceNoteValue>({
  name: "voiceNote",
  title: "Voice note",
  description: "Record or upload a short audio clip.",
  icon: MicIcon,
  category: "media",
  fields: voiceNoteFormFields,
  defaultValues: {},
  schema: voiceNoteSchema,
  View: VoiceNoteView,
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
