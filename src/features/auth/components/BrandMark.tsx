/**
 * The bakery's mark: a seed above two pairs of leaves on a short stem, drawn
 * rather than borrowed. It appears once, at the top of the authentication
 * screens, and is the only ornament in the product — everything else in the
 * kit is a control.
 */
export function BrandMark({ size = 54 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * (58 / 52)}
      viewBox="0 0 52 58"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {/* the seed */}
      <path d="M26 3.5c5.5 6.4 5.5 14.4 0 20.8-5.5-6.4-5.5-14.4 0-20.8Z" />
      <circle cx="26" cy="12.6" r="2.1" />

      {/* the stem, stopping short of the leaves so it reads as growth */}
      <path d="M26 24.3V53" />

      {/* the broad pair */}
      <path d="M25.2 28.6c-7.9-4.4-15.8-2-19.6 5.6 8 4.4 15.9 2 19.6-5.6Z" />
      <path d="M26.8 28.6c7.9-4.4 15.8-2 19.6 5.6-8 4.4-15.9 2-19.6-5.6Z" />

      {/* the close pair, shorter, so the silhouette tapers */}
      <path d="M25.3 40.2c-5.6-3.1-11.2-1.4-13.9 4 5.7 3.1 11.3 1.4 13.9-4Z" />
      <path d="M26.7 40.2c5.6-3.1 11.2-1.4 13.9 4-5.7 3.1-11.3 1.4-13.9-4Z" />
    </svg>
  );
}
