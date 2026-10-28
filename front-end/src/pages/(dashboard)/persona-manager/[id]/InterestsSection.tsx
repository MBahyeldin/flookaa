import { useState } from "react";
import { toast } from "sonner";
import InterestPicker from "@/components/interests/InterestPicker";
import { usePersonaInterests } from "@/components/interests/usePersonaInterests";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { MAX_PERSONA_INTERESTS } from "@/types/interest";

export function InterestsSection({ personaId }: { personaId: number }) {
  const [attempt, setAttempt] = useState(0);
  return <Interests key={attempt} personaId={personaId} onRetry={() => setAttempt((n) => n + 1)} />;
}

function Interests({ personaId, onRetry }: { personaId: number; onRetry: () => void }) {
  const { data, value, setValue, save, dirty, loadError } = usePersonaInterests(personaId);
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    setSaving(true);
    const r = await save();
    setSaving(false);
    if (r.ok) toast.success("Interests saved");
    else toast.error("Couldn't save the interests. Please try again.");
  };

  return (
    <SettingsSection
      id="interests"
      title="Interests"
      lead="Only you see this persona's interests. They shape your suggestions."
      onSave={data ? onSave : undefined}
      dirty={dirty}
      canSave={value.length > 0}
      saving={saving}
      note={
        data && (
          <span aria-live="polite">
            {value.length === 0 ? "Pick at least one." : `${value.length} / ${MAX_PERSONA_INTERESTS}`}
          </span>
        )
      }
    >
      {loadError ? (
        <ErrorState compact title="Couldn't load interests" onRetry={onRetry} />
      ) : !data ? (
        <div className="flex flex-wrap gap-2" aria-busy="true">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
      ) : (
        <InterestPicker groups={data.groups} retired={data.retired} value={value} onChange={setValue} showCount={false} />
      )}
    </SettingsSection>
  );
}
