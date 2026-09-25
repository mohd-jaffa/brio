import { readLogo, replaceLogo } from "@/features/business/api";
import { logoResponse } from "@/features/business/logo";
import { withBakeryRoute } from "@/features/auth/guard";
import { MAX_LOGO_BYTES } from "@/constants/uploads";
import { readBody } from "@/lib/api/handler";

export const runtime = "nodejs";

/** The business's logo, for its own signed-in owner only (plan §56). */
export async function GET(request: Request) {
  return withBakeryRoute(request, async (tenant) => {
    const logo = await readLogo(tenant);
    return logoResponse(logo.file, { ...logo, requested: new URL(request.url).searchParams.get("v") });
  });
}

/** The file itself is the body: PNG, JPEG or WebP, at most 500 KB (plan §56, §118). */
export async function POST(request: Request) {
  return withBakeryRoute(request, async (tenant) =>
    replaceLogo(tenant, await readBody(request, { maxBytes: MAX_LOGO_BYTES, tooLarge: "LOGO_TOO_LARGE" })),
  );
}
