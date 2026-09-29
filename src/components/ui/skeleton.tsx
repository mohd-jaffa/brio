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

/**
 * A screen on its way (plan §134 P1-2): its title, a line under it and its
 * rows, in the page's place, while the header and the navigation stay put.
 * It says so to a screen reader once.
 */
export function ScreenSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} data-screen-skeleton="" className="space-y-6">
      <div aria-hidden="true" className="space-y-2">
        <div className="h-9 w-48 animate-pulse rounded-xl bg-sunken" />
        <div className="h-4 w-64 max-w-full animate-pulse rounded-lg bg-sunken" />
      </div>
      <SkeletonRows rows={4} height="h-20" />
    </div>
  );
}
