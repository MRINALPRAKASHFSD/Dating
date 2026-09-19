export function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-secondary" role="progressbar" aria-label="Onboarding progress" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step} aria-valuetext={`Step ${step} of ${total}`}>
      <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${(step / total) * 100}%` }} />
    </div>
  );
}