"use client";

import { useElementSize } from "@/hooks/useElementSize";

import { cn } from "../cn";
import { linearScale, monotonePath } from "./geometry";

// Room at the edges for the last point's dot.
const PAD = 3;

/**
 * The shape of a stat tile's period in a 2 px line, with a dot on its last
 * point and no axes (plan §139.11.11). Hidden from screen readers: the tile
 * says its change in words. It shows shape, not size, so it spans the
 * period's own low to high rather than starting at zero.
 */
export function Sparkline({
  values,
  height = 32,
  className,
}: {
  values: number[];
  height?: number;
  className?: string;
}) {
  const [ref, { width }] = useElementSize<HTMLDivElement>();
  const low = Math.min(...values);
  const high = Math.max(...values);
  const y = high === low ? () => height / 2 : linearScale([low, high], [height - PAD, PAD]);
  const step = values.length > 1 ? (width - 2 * PAD) / (values.length - 1) : 0;
  const points = values.map((value, index) => ({ x: PAD + index * step, y: y(value) }));
  const last = points[points.length - 1];

  return (
    <div ref={ref} aria-hidden="true" className={cn("w-full", className)} style={{ height }}>
      {width > 0 && points.length > 1 && (
        <svg width={width} height={height} className="overflow-visible">
          <path
            d={monotonePath(points)}
            fill="none"
            stroke="var(--color-chart-1)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={last.x} cy={last.y} r={PAD} fill="var(--color-chart-1)" />
        </svg>
      )}
    </div>
  );
}
