import type { NextConfig } from "next";

import { version } from "./package.json";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    // AVIF first: the same picture in fewer bytes wherever a browser takes it.
    formats: ["image/avif", "image/webp"],
    // 75 for illustrations and the logo; 60 for the photographic plates, which
    // are faded and masked behind words (src/assets/plates, PLATE_QUALITY).
    qualities: [60, 75],
  },
  // Settings → About shows it (R5.11).
  env: { NEXT_PUBLIC_APP_VERSION: version },
};

export default nextConfig;
