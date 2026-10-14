import { TimerIcon } from "lucide-react";
import { z } from "zod";
import { FormField } from "@/models/Forms/FormField";
import { useNow } from "@/hooks/useNow";
import { defineBlock } from "./defineBlock";

const MAX_TEXT = 120;
const MAX_YEARS = 100;
const MIN_ENDS_AT = Date.UTC(2000, 0, 1);
const DEFAULT_ENDED_TEXT = "This countdown has ended.";

const oneLine = z
  .string()
  .refine((text) => text.length <= MAX_TEXT, `must be at most ${MAX_TEXT} characters`)
  .refine((text) => !/[\r\n]/.test(text), "must be one line")
  .optional();

function maxEndsAt() {
  const max = new Date();
  max.setFullYear(max.getFullYear() + MAX_YEARS);
  return max.getTime();
}

const countdownSchema = z.object({
  endsAt: z
    .string({ error: "is required" })
    .refine((endsAt) => !Number.isNaN(Date.parse(endsAt)), "is required")
    .refine((endsAt) => {
      const time = Date.parse(endsAt);
      return Number.isNaN(time) || (time >= MIN_ENDS_AT && time <= maxEndsAt());
    }, `must be between 2000 and ${MAX_YEARS} years from now`),
  label: oneLine,
  endedText: oneLine,
});

type CountdownValue = z.infer<typeof countdownSchema>;

const pad = (n: number) => String(n).padStart(2, "0");

// datetime-local wants the author's wall-clock time, without a zone.
function toLocalInput(iso: string | undefined) {
  const date = iso ? new Date(iso) : undefined;
  if (!date || Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(local: unknown) {
  const date = typeof local === "string" && local ? new Date(local) : undefined;
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function zoneName(date: Date) {
  return new Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;
}

function formatTarget(date: Date) {
  const text = new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "short" }).format(date);
  const zone = zoneName(date);
  return zone ? `${text} ${zone}` : text;
}

const countdownFormFields: FormField[] = [
  new FormField({
    id: "label",
    name: "label",
    label: "Label",
    type: "string",
    interfaceType: "text",
    placeholder: "What are we counting down to?",
  }),
  new FormField({
    id: "endsAt",
    name: "endsAt",
    label: "Ends at",
    type: "string",
    interfaceType: "datetime",
    isRequired: true,
    hint: (value) => {
      const time = value ? new Date(value).getTime() : NaN;
      if (!Number.isNaN(time) && time <= Date.now()) {
        return "This time has passed, so the countdown will show as ended.";
      }
      const zone = zoneName(Number.isNaN(time) ? new Date() : new Date(time));
      return zone ? `Your time, ${zone}` : "Your time";
    },
  }),
  new FormField({
    id: "endedText",
    name: "endedText",
    label: "Ended text",
    type: "string",
    interfaceType: "text",
    placeholder: DEFAULT_ENDED_TEXT,
  }),
];

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;

function CountdownView({ value }: { value: CountdownValue }) {
  const endsAt = Date.parse(value.endsAt);
  const now = useNow(endsAt);
  const target = new Date(endsAt);
  const label = value.label?.trim() ? value.label : undefined;
  const endedText = value.endedText?.trim() ? value.endedText : DEFAULT_ENDED_TEXT;

  if (Number.isNaN(endsAt)) return null;
  const total = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const ended = total === 0;
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  const units = [
    ...(days > 0 ? [{ value: String(days), unit: days === 1 ? "day" : "days" }] : []),
    { value: pad(hours), unit: "hours" },
    { value: pad(minutes), unit: "min" },
    { value: pad(seconds), unit: "sec" },
  ];
  const spoken = ended
    ? endedText
    : `Ends in ${[days && plural(days, "day"), hours && plural(hours, "hour"), plural(minutes, "minute")]
        .filter(Boolean)
        .join(", ")}`;

  return (
    <div className="rounded-md border border-border bg-card px-4 py-3 text-card-foreground">
      <div className="flex min-w-0 items-center gap-2">
        <TimerIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        <span dir="auto" className="min-w-0 font-semibold break-words">
          {label ?? "Countdown"}
        </span>
      </div>
      <span className="sr-only" aria-live="polite">
        {spoken}
      </span>
      {ended ? (
        <p dir="auto" aria-hidden className="mt-3 text-lg font-semibold break-words">
          {endedText}
        </p>
      ) : (
        <div aria-hidden className="mt-3 flex flex-wrap gap-2">
          {units.map((part) => (
            <div
              key={part.unit}
              className="flex min-w-16 flex-col items-center rounded-md border border-border bg-background px-3 py-2"
            >
              <span className="text-2xl font-semibold tabular-nums text-foreground">{part.value}</span>
              <span className="text-xs text-muted-foreground">{part.unit}</span>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 text-sm text-muted-foreground">
        {ended ? "Ended " : "Ends "}
        <time dateTime={value.endsAt}>{formatTarget(target)}</time>
      </p>
    </div>
  );
}

const inMs = (ms: number) => fromLocalInput(toLocalInput(new Date(Date.now() + ms).toISOString()));

export const countdown = defineBlock<CountdownValue>({
  name: "countdown",
  title: "Countdown",
  description: "A live countdown to a date and time.",
  icon: TimerIcon,
  category: "layout",
  fields: countdownFormFields,
  defaultValues: {},
  schema: countdownSchema,
  View: CountdownView,
  toForm: (value) => ({ ...value, endsAt: toLocalInput(value.endsAt) }),
  fromForm: (form) => ({ ...form, endsAt: fromLocalInput(form.endsAt) }) as CountdownValue,
  examples: [
    { label: "Launch", endsAt: inMs(3 * 86400_000 + 4 * 3600_000) },
    { label: "Doors open", endsAt: inMs(42 * 60_000), endedText: "We're live!" },
    { label: "Early-bird tickets", endsAt: "2026-01-01T00:00:00Z" },
    { label: "موعد الإطلاق", endsAt: inMs(10 * 86400_000) },
  ],
});
