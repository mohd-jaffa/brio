/**
 * The two axes the line and bar charts share: the value axis as horizontal
 * gridlines with compact labels (no vertical lines, as the references draw
 * it), and the category axis as a few evenly spread dates.
 */

const AXIS_FONT_SIZE = 11;
const AXIS_LABEL_GAP = 8;
// Where there is nothing to measure with — the server, or jsdom — a generous
// width per character at 11 px.
const FALLBACK_CHAR_WIDTH = 7;

let measurer: CanvasRenderingContext2D | null | undefined;

/**
 * How wide `text` is drawn on an axis: measured in the page's own font, so a
 * margin fits its labels exactly and two dates are known to touch before they
 * do. A guess from its length where nothing can measure.
 */
export function labelWidth(text: string) {
  if (typeof document === "undefined") return text.length * FALLBACK_CHAR_WIDTH;
  if (measurer === undefined) {
    measurer = document.createElement("canvas").getContext("2d");
    if (measurer) measurer.font = `${AXIS_FONT_SIZE}px ${getComputedStyle(document.body).fontFamily}`;
  }
  return measurer ? measurer.measureText(text).width : text.length * FALLBACK_CHAR_WIDTH;
}

/** The left margin the value labels need. */
export function valueAxisWidth(labels: string[]) {
  return Math.ceil(Math.max(0, ...labels.map(labelWidth))) + AXIS_LABEL_GAP;
}

export function ValueAxis({
  ticks,
  labels,
  y,
  left,
  right,
}: {
  ticks: number[];
  labels: string[];
  y: (value: number) => number;
  left: number;
  right: number;
}) {
  return (
    <g>
      {ticks.map((tick, index) => (
        <g key={tick}>
          <line x1={left} x2={right} y1={y(tick)} y2={y(tick)} stroke="var(--color-border)" strokeWidth={1} />
          <text
            x={left - AXIS_LABEL_GAP}
            y={y(tick)}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize={AXIS_FONT_SIZE}
            className="fill-text-muted tabular-nums"
          >
            {labels[index]}
          </text>
        </g>
      ))}
    </g>
  );
}

/** The least space between two dates on the axis. */
export const CATEGORY_GAP = 6;

/**
 * The dates under the plot. A label is centred under its point, but held
 * inside the plot at either end, so the last date of a bar chart does not
 * hang past the card's edge. A label that would then touch the one after it
 * is left out; the last date always stays.
 */
export function CategoryAxis({
  indices,
  labels,
  x,
  y,
  width,
}: {
  indices: number[];
  labels: string[];
  x: (index: number) => number;
  y: number;
  width: number;
}) {
  const placed: { index: number; centre: number }[] = [];
  let limit = Infinity;
  for (const index of [...indices].reverse()) {
    const half = labelWidth(labels[index]) / 2;
    const centre = Math.min(Math.max(x(index), half), width - half);
    if (centre + half > limit) continue;
    placed.unshift({ index, centre });
    limit = centre - half - CATEGORY_GAP;
  }
  return (
    <g>
      {placed.map(({ index, centre }) => (
        <text key={index} x={centre} y={y} textAnchor="middle" fontSize={AXIS_FONT_SIZE} className="fill-text-muted">
          {labels[index]}
        </text>
      ))}
    </g>
  );
}
