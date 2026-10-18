export default function OnboardingProgress({ current, total }: { current: number; total: number }) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-1.5">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-label="Onboarding progress"
        className="h-2 w-full rounded-full bg-card border border-border overflow-hidden"
      >
        <div className="bg-primary h-full rounded-full transition-[width] duration-300" style={{ width: `${percent}%` }} />
      </div>
      <span className="self-end text-xs font-medium text-muted-foreground tabular-nums">
        {current} / {total}
      </span>
    </div>
  );
}
