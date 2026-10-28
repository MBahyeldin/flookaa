import { RadioCard, RadioCardGroup } from "@/components/ui/radio-card";
import { PRIVACY_OPTIONS, type Privacy } from "./options";

export default function PrivacyStep({
  value,
  onChange,
  warning,
}: {
  value: Privacy;
  onChange: (privacy: Privacy) => void;
  warning: string | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      <RadioCardGroup aria-label="Who can see this persona">
        {PRIVACY_OPTIONS.map(({ value: option, label, note, icon }) => (
          <RadioCard
            key={option}
            icon={icon}
            title={label}
            body={note}
            checked={option === value}
            onSelect={() => onChange(option)}
          />
        ))}
      </RadioCardGroup>
      {warning && <PrivacyWarning>{warning}</PrivacyWarning>}
      <p className="text-xs text-muted-foreground">You can change this any time.</p>
    </div>
  );
}

export function PrivacyWarning({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
      {children}
    </p>
  );
}
