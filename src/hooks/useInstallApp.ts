"use client";

import { useSyncExternalStore } from "react";

import { isAndroidApp } from "@/lib/native";
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
const notInTheApp = () => false;

/**
 * Installing the app (plan §139.19 R7.3): whether to offer it — in the
 * browser, never inside the installed app nor the Android app, which is
 * already installed — whether the browser will install
 * it itself, and whose steps to show. The server knows none of this, so the
 * page is drawn without the offer and it appears once the browser has said.
 */
export function useInstallApp() {
  const state = useSyncExternalStore(subscribeInstall, installState, () => UNKNOWN);
  const platform = useSyncExternalStore<InstallPlatform>(nothingChanges, thisDevice, () => "other");
  const android = useSyncExternalStore(nothingChanges, isAndroidApp, notInTheApp);
  return {
    offered: state.known && !state.installed && !android,
    canPrompt: state.canPrompt,
    platform,
    install: promptInstall,
  };
}
