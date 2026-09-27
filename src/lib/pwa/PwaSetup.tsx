"use client";

import { useEffect } from "react";

import { publicAppVersion } from "@/lib/env/public";
import { logger } from "@/lib/logger";

import { listenForInstall } from "./install";
import { setUpServiceWorker } from "./serviceWorker";

/**
 * The installed app's setup, once for the whole page (plan §139.19 R7): the
 * service worker, and listening for the browser's offer to install. It draws
 * nothing.
 */
export function PwaSetup() {
  useEffect(() => {
    const stop = listenForInstall();
    setUpServiceWorker(publicAppVersion()).catch((failure: unknown) =>
      logger.warn("The service worker could not be set up", {
        reason: failure instanceof Error ? failure.message : String(failure),
      }),
    );
    return stop;
  }, []);
  return null;
}
