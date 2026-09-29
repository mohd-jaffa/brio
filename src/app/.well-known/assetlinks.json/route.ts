import { ANDROID_APP_ID } from "@/constants/android";
import { getServerEnv } from "@/lib/env/server";

/**
 * Android App Links (plan §139.17.3, R8.5): the site's word that the Android
 * app may open its links itself — the email confirmation, which then signs in
 * the app rather than a browser. Android reads it as the app is installed and
 * checks it against the app's signature, so it names the keys the app is
 * signed with (`ANDROID_CERT_FINGERPRINTS`). Until they are set it vouches
 * for nothing, and the links open in the browser.
 *
 * Plain JSON, not the API's envelope: it is Google's format. It must answer
 * without a redirect, so the proxy leaves `/.well-known/` alone.
 */
export function GET() {
  const fingerprints = getServerEnv().ANDROID_CERT_FINGERPRINTS;
  if (fingerprints.length === 0) return new Response(null, { status: 404 });

  return Response.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: { namespace: "android_app", package_name: ANDROID_APP_ID, sha256_cert_fingerprints: fingerprints },
      },
    ],
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
