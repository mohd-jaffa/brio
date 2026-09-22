/** A placeholder while something loads. Hidden from screen readers — the list says it is loading. */
export function Skeleton({ height = "h-24" }: { height?: string }) {
  return <div aria-hidden="true" className={`${height} animate-pulse rounded-2xl border border-border bg-surface`} />;
}

export function SkeletonRows({ rows = 3, height }: { rows?: number; height?: string }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} height={height} />
      ))}
    </div>
  );
}
