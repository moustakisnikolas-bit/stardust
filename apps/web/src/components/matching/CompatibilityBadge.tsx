export function CompatibilityBadge({ score }: { score: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-stardust-800/90 px-3 py-1 text-sm font-medium text-stardust-200 shadow">
      <span aria-hidden>✦</span>
      {score}% compatible
    </span>
  );
}
