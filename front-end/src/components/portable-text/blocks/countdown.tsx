import { ClockIcon, SparklesIcon, TimerIcon } from "lucide-react";
import { z } from "zod";
import { FormField } from "@/models/Forms/FormField";
import { useNow } from "@/hooks/useNow";
import { perLanguage, t } from "@/i18n";
import { dateFormat, relativeFormat } from "@/lib/format";
import { dateRange, maxChars, oneLine, required } from "./validation";
import { defineBlock } from "./defineBlock";

const MAX_TEXT = 120;
const MAX_YEARS = 100;
const MIN_ENDS_AT = Date.UTC(2000, 0, 1);
const defaultEndedText = () => t("blocks:countdown.ended");

const shortText = z
  .string()
  .refine((text) => text.length <= MAX_TEXT, maxChars(MAX_TEXT))
  .refine((text) => !/[\r\n]/.test(text), oneLine)
  .optional();

function maxEndsAt() {
  const max = new Date();
  max.setFullYear(max.getFullYear() + MAX_YEARS);
  return max.getTime();
}

const countdownSchema = z.object({
  endsAt: z
    .string(required)
    .refine((endsAt) => !Number.isNaN(Date.parse(endsAt)), required)
    .refine((endsAt) => {
      const time = Date.parse(endsAt);
      return Number.isNaN(time) || (time >= MIN_ENDS_AT && time <= maxEndsAt());
    }, dateRange(MAX_YEARS)),
  label: shortText,
  endedText: shortText,
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
  return dateFormat({ timeZoneName: "short" })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;
}

function formatTarget(date: Date) {
  const text = dateFormat({ dateStyle: "full", timeStyle: "short" }).format(date);
  const zone = zoneName(date);
  return zone ? `${text} ${zone}` : text;
}

const relativeUnits: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 86400],
  ["month", 30 * 86400],
  ["week", 7 * 86400],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

function formatAgo(seconds: number) {
  const rtf = relativeFormat();
  const found = relativeUnits.find(([, size]) => seconds >= size);
  return found ? rtf.format(-Math.floor(seconds / found[1]), found[0]) : rtf.format(0, "minute");
}

const countdownFormFields = perLanguage((): FormField[] => [
  new FormField({
    id: "label",
    name: "label",
    label: t("blocks:countdown.fields.label"),
    type: "string",
    interfaceType: "text",
    placeholder: t("blocks:countdown.fields.whatAreWeCountingDown"),
  }),
  new FormField({
    id: "endsAt",
    name: "endsAt",
    label: t("blocks:countdown.fields.endsAt"),
    type: "string",
    interfaceType: "datetime",
    isRequired: true,
    hint: (value) => {
      const time = value ? new Date(value).getTime() : NaN;
      if (!Number.isNaN(time) && time <= Date.now()) {
        return t("blocks:countdown.passed");
      }
      const zone = zoneName(Number.isNaN(time) ? new Date() : new Date(time));
      return zone ? t("blocks:countdown.yourTimeZone", { zone }) : t("blocks:countdown.yourTime");
    },
  }),
  new FormField({
    id: "endedText",
    name: "endedText",
    label: t("blocks:countdown.fields.endedText"),
    type: "string",
    interfaceType: "text",
    placeholder: defaultEndedText(),
  }),
]);

function CountdownView({ value }: { value: CountdownValue }) {
  const endsAt = Date.parse(value.endsAt);
  const now = useNow(endsAt);
  const target = new Date(endsAt);
  const label = value.label?.trim() ? value.label : undefined;
  const endedText = value.endedText?.trim() ? value.endedText : defaultEndedText();

  if (Number.isNaN(endsAt)) return null;
  const total = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const ended = total === 0;
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  const units = [
    ...(days > 0 ? [{ key: "days", value: String(days), unit: t("blocks:countdown.units.days", { count: days }) }] : []),
    { key: "hours", value: pad(hours), unit: t("blocks:countdown.units.hours") },
    { key: "min", value: pad(minutes), unit: t("blocks:countdown.units.min") },
    { key: "sec", value: pad(seconds), unit: t("blocks:countdown.units.sec") },
  ];
  const spoken = ended
    ? endedText
    : t("blocks:countdown.endsIn", {
        parts: [
          days && t("blocks:countdown.spoken.days", { count: days }),
          hours && t("blocks:countdown.spoken.hours", { count: hours }),
          t("blocks:countdown.spoken.minutes", { count: minutes }),
        ]
          .filter(Boolean)
          .join(t("blocks:countdown.separator")),
      });

  const LabelIcon = ended ? SparklesIcon : ClockIcon;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-primary px-5 py-6 text-center text-primary-foreground md:px-8">
      <span aria-hidden className="absolute -top-12 -start-12 size-40 rounded-full bg-primary-foreground/10" />
      <span aria-hidden className="absolute -end-10 -bottom-14 size-36 rounded-full bg-primary-foreground/10" />
      <p className="relative flex items-center justify-center gap-2 text-overline uppercase">
        <LabelIcon aria-hidden className="size-4 shrink-0" />
        <span dir="auto" className="min-w-0 break-words">
          {label ?? t("blocks:countdown.title")}
        </span>
      </p>
      <span className="sr-only" aria-live="polite">
        {spoken}
      </span>
      {ended ? (
        <>
          <p dir="auto" aria-hidden className="relative mt-3 text-h3 break-words">
            {endedText}
          </p>
          <p className="relative mt-2 text-sm opacity-90">
            {t("blocks:countdown.endedPrefix")}{" "}
            <time dateTime={value.endsAt} title={formatTarget(target)}>
              {formatAgo(Math.floor((now - endsAt) / 1000))}
            </time>
          </p>
        </>
      ) : (
        <>
          <div aria-hidden className="relative mt-4 flex flex-wrap justify-center gap-2 md:gap-3">
            {units.map((part) => (
              <div
                key={part.key}
                className="flex min-w-16 flex-col items-center rounded-xl bg-card px-3 py-2 text-card-foreground md:min-w-20 md:py-3"
              >
                <span className="text-3xl font-semibold text-primary tabular-nums md:text-4xl">{part.value}</span>
                <span className="text-xs text-muted-foreground">{part.unit}</span>
              </div>
            ))}
          </div>
          <p className="sr-only">
            {t("blocks:countdown.endsPrefix")} <time dateTime={value.endsAt}>{formatTarget(target)}</time>
          </p>
        </>
      )}
    </div>
  );
}

const inMs = (ms: number) => fromLocalInput(toLocalInput(new Date(Date.now() + ms).toISOString()));

export const countdown = defineBlock<CountdownValue>({
  name: "countdown",
  get title() {
    return t("blocks:countdown.title");
  },
  get description() {
    return t("blocks:countdown.description");
  },
  icon: TimerIcon,
  category: "layout",
  get fields() {
    return countdownFormFields();
  },
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
