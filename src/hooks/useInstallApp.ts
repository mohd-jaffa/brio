"use client";

import { useSyncExternalStore } from "react";

import {
  installPlatform,
  installState,
  promptInstall,
  subscribeInstall,
  UNKNOWN,
  type InstallPlatform,
} from "@/lib/pwa/install";

const nothingChanges = () => () => {};
const thisDevice = (): InstallPlatform => installPlatform(navigator.userAgent, navigator.maxTouchPoints);

/**
 * Installing the app (plan §139.19 R7.3): whether to offer it — in the
 * browser, never inside the installed app — whether the browser will install
 * it itself, and whose steps to show. The server knows none of this, so the
 * page is drawn without the offer and it appears once the browser has said.
 */
export function useInstallApp() {
  const state = useSyncExternalStore(subscribeInstall, installState, () => UNKNOWN);
  const platform = useSyncExternalStore<InstallPlatform>(nothingChanges, thisDevice, () => "other");
  return {
    offered: state.known && !state.installed,
    canPrompt: state.canPrompt,
    platform,
    install: promptInstall,
  };
}
