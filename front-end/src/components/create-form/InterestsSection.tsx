import InterestPicker from "@/components/interests/InterestPicker";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonList } from "@/components/ui/skeleton";
import { MAX_CHANNEL_INTERESTS, type InterestGroup } from "@/types/interest";
import { FieldError } from "./fields";

export function InterestsSection({
  lead,
  groups,
  onRetry,
  value,
  onChange,
  error,
}: {
  lead: string;
  groups: InterestGroup[] | "error" | null;
  onRetry: () => void;
  value: number[];
  onChange: (ids: number[]) => void;
  error?: string;
}) {
  return (
    <SettingsSection id="interests" title="Interests" lead={lead}>
      {groups === null && <SkeletonList count={2} />}
      {groups === "error" && <ErrorState compact title="Couldn't load the interests" onRetry={onRetry} />}
      {Array.isArray(groups) && (
        <InterestPicker groups={groups} retired={[]} value={value} onChange={onChange} max={MAX_CHANNEL_INTERESTS} />
      )}
      <FieldError>{error}</FieldError>
    </SettingsSection>
  );
}
