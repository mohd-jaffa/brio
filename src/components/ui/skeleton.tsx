/**
 * A placeholder while something loads, in the sunken tone the loaded card's
 * wells use (plan §139.5). Hidden from screen readers — the list says it is
 * loading. Marked as a skeleton, so what replaces it fades in over it
 * (`useSettle`, on the app's main region).
 */
export function Skeleton({ height = "h-24" }: { height?: string }) {
  return <div aria-hidden="true" data-skeleton="" className={`${height} animate-pulse rounded-2xl bg-sunken`} />;
}

export function SkeletonRows({ rows = 3, height }: { rows?: number; height?: string }) {
  return (
    <div data-skeleton="" className="space-y-3">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} height={height} />
      ))}
    </div>
  );
}
