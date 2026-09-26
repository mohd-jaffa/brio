import type { NextConfig } from "next";

import { version } from "./package.json";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Settings → About shows it (R5.11).
  env: { NEXT_PUBLIC_APP_VERSION: version },
};

export default nextConfig;
