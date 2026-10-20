export default function OnboardingProgress({ current, total }: { current: number; total: number }) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-2">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-label="Onboarding progress"
        className="h-3 w-full rounded-full bg-white overflow-hidden"
      >
        <div
          className="h-full rounded-full bg-linear-to-r from-brand-start to-brand-end transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="self-end text-sm text-foreground tabular-nums">
        {current} / {total}
      </span>
    </div>
  );
}
