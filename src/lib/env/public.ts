/**
 * What the browser may know of the environment: Next writes `NEXT_PUBLIC_*`
 * values into the page when it is built. The app's web root is credited in a
 * bill's footer (plan §139.1 #9).
 */
export function publicAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "";
}
