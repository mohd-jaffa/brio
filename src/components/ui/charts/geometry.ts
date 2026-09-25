/**
 * The arithmetic behind the charts (plan §139.11.11): scales, ticks, the
 * curve, the bars and the ring. Pure, so it is tested without drawing, and
 * the chart components only lay out what these return.
 */

export interface Point {
  x: number;
  y: number;
}

/** Maps a value in `domain` onto `range`. A flat domain maps everything to its start. */
export function linearScale([d0, d1]: [number, number], [r0, r1]: [number, number]) {
  return (value: number) => (d1 === d0 ? r0 : r0 + ((value - d0) / (d1 - d0)) * (r1 - r0));
}

/**
 * Round steps for a value axis, from 0 to the first step at or above `max`:
 * 0, 2K, 4K, 6K, 8K for a peak of ₹7,000. Every step is a whole multiple of
 * `minStep`, so an axis of orders never reads 2.5 and one of paise never
 * shows a fraction of a rupee. An empty series still gets an axis.
 */
export function niceTicks(max: number, { count = 4, minStep = 1 }: { count?: number; minStep?: number } = {}) {
  if (!(max > 0)) return [0, minStep];
  const rough = Math.max(max / count, minStep);
  const power = 10 ** Math.floor(Math.log10(rough));
  const step =
    [1, 2, 2.5, 5, 10]
      .map((multiple) => multiple * power)
      .find((candidate) => candidate >= rough && Number.isInteger(candidate / minStep)) ??
    Math.ceil(rough / minStep) * minStep;
  const steps = Math.ceil(max / step);
  return Array.from({ length: steps + 1 }, (_, index) => index * step);
}

/**
 * Which of `length` points get a label on the category axis: at most `max`,
 * at an even step from the first — 1, 7, 13, 19, 25 Sep — so the gaps say the
 * same span of time. The last point is labelled too, unless it would crowd
 * the label before it, which then gives way to it.
 */
export function tickIndices(length: number, max: number): number[] {
  if (length <= 0) return [];
  if (length <= max) return Array.from({ length }, (_, index) => index);
  const step = Math.ceil((length - 1) / (Math.max(2, max) - 1));
  const indices: number[] = [];
  for (let index = 0; index < length; index += step) indices.push(index);
  const last = length - 1;
  const tail = last - indices[indices.length - 1];
  if (tail >= step / 2) indices.push(last);
  else if (tail > 0) indices[indices.length - 1] = last;
  return indices;
}

/** How many category labels fit across `width` px: two to six, one per 48 px. */
export function tickBudget(width: number) {
  return Math.max(2, Math.min(6, Math.floor(width / 48)));
}

/** The index of the value in `positions` closest to `x`. */
export function nearestIndex(positions: number[], x: number) {
  let best = 0;
  for (let index = 1; index < positions.length; index++) {
    if (Math.abs(positions[index] - x) < Math.abs(positions[best] - x)) best = index;
  }
  return best;
}

const sign = (value: number) => (value < 0 ? -1 : 1);

// The tangent at the middle of three points, limited so the curve never
// overshoots either neighbour (Steffen, as d3's curveMonotoneX).
function innerTangent(a: Point, b: Point, c: Point) {
  const h0 = b.x - a.x;
  const h1 = c.x - b.x;
  const s0 = (b.y - a.y) / h0;
  const s1 = (c.y - b.y) / h1;
  const p = (s0 * h1 + s1 * h0) / (h0 + h1);
  return (sign(s0) + sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0;
}

// The tangent at an end, from the segment beside it and its other tangent.
const endTangent = (a: Point, b: Point, other: number) => (3 * ((b.y - a.y) / (b.x - a.x)) - other) / 2;

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * A smooth line through `points` that never rises above a peak or dips below
 * a trough between them: a flat week stays flat. Points must run left to right.
 */
export function monotonePath(points: Point[]): string {
  if (points.length === 0) return "";
  const [first] = points;
  if (points.length === 1) return `M${round(first.x)},${round(first.y)}`;
  if (points.length === 2) {
    return `M${round(first.x)},${round(first.y)}L${round(points[1].x)},${round(points[1].y)}`;
  }

  const tangents = points.map((point, index) =>
    index === 0 || index === points.length - 1 ? 0 : innerTangent(points[index - 1], point, points[index + 1]),
  );
  tangents[0] = endTangent(points[0], points[1], tangents[1]);
  const last = points.length - 1;
  tangents[last] = endTangent(points[last - 1], points[last], tangents[last - 1]);

  let path = `M${round(first.x)},${round(first.y)}`;
  for (let index = 0; index < last; index++) {
    const a = points[index];
    const b = points[index + 1];
    const dx = (b.x - a.x) / 3;
    path +=
      `C${round(a.x + dx)},${round(a.y + dx * tangents[index])}` +
      ` ${round(b.x - dx)},${round(b.y - dx * tangents[index + 1])}` +
      ` ${round(b.x)},${round(b.y)}`;
  }
  return path;
}

/** The line's path closed down to `baseline`, for the soft fill beneath it. */
export function areaPath(points: Point[], baseline: number): string {
  if (points.length < 2) return "";
  const first = points[0];
  const last = points[points.length - 1];
  return `${monotonePath(points)}L${round(last.x)},${round(baseline)}L${round(first.x)},${round(baseline)}Z`;
}

/** A bar standing on `bottom` with its top corners rounded. Nothing for a zero. */
export function roundedTopBar({ x, width, top, bottom, radius }: { x: number; width: number; top: number; bottom: number; radius: number }) {
  const height = bottom - top;
  if (height <= 0 || width <= 0) return "";
  const r = Math.min(radius, width / 2, height);
  return (
    `M${round(x)},${round(bottom)}V${round(top + r)}` +
    `A${round(r)},${round(r)} 0 0 1 ${round(x + r)},${round(top)}` +
    `H${round(x + width - r)}` +
    `A${round(r)},${round(r)} 0 0 1 ${round(x + width)},${round(top + r)}` +
    `V${round(bottom)}Z`
  );
}

/**
 * Whole percentages that add up to exactly 100 — the largest remainders get
 * the spare points — so a legend never reads 99 % or 101 %.
 */
export function shares(values: number[]): number[] {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!(total > 0)) return values.map(() => 0);
  const exact = values.map((value) => (value * 100) / total);
  const floors = exact.map(Math.floor);
  let spare = 100 - floors.reduce((sum, value) => sum + value, 0);
  const byRemainder = exact.map((value, index) => ({ index, rest: value - floors[index] })).sort((a, b) => b.rest - a.rest);
  for (const { index } of byRemainder) {
    if (spare <= 0) break;
    floors[index] += 1;
    spare -= 1;
  }
  return floors;
}

export interface Slice {
  label: string;
  value: number;
}

/**
 * The largest slices first, with anything past the fifth folded into one
 * "Others" slice — six is all the palette has. Six or fewer are kept as they
 * are, since folding one slice into "Others" would only hide its name.
 * Empty slices are dropped.
 */
export function topWithOthers(slices: Slice[], othersLabel: string, keep = 5): Slice[] {
  const sorted = slices.filter((slice) => slice.value > 0).sort((a, b) => b.value - a.value);
  if (sorted.length <= keep + 1) return sorted;
  const rest = sorted.slice(keep).reduce((sum, slice) => sum + slice.value, 0);
  return [...sorted.slice(0, keep), { label: othersLabel, value: rest }];
}

/**
 * Where each value's arc starts on a ring of `circumference`, and how long it
 * is, with `gap` left between neighbours. A lone value closes the ring.
 */
export function ringSegments(values: number[], circumference: number, gap: number) {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!(total > 0)) return [];
  const spacing = values.length > 1 ? gap : 0;
  let start = 0;
  return values.map((value) => {
    const span = (value / total) * circumference;
    const segment = { start: start + spacing / 2, length: Math.max(0, span - spacing) };
    start += span;
    return segment;
  });
}
