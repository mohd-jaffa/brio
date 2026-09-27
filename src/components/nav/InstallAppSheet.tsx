"use client";

import {
  Compass,
  Download,
  EllipsisVertical,
  Globe,
  Menu,
  MonitorDown,
  Share,
  SquarePlus,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { UI_TEXT } from "@/constants/messages";
import { useInstallApp } from "@/hooks/useInstallApp";
import type { InstallPlatform } from "@/lib/pwa/install";

const text = UI_TEXT.install;

/** A mark for each step, as the device shows it: Safari's Share, Chrome's three dots. */
const STEP_ICONS: Record<InstallPlatform, readonly LucideIcon[]> = {
  ios: [Compass, Share, SquarePlus],
  android: [Globe, EllipsisVertical, Download],
  desktop: [Globe, MonitorDown, Download],
  other: [Globe, Menu, SquarePlus],
};

/**
 * Installing Ovenly (plan §139.19 R7.3; the user, 2026-09-27: "which will
 * also give small tutorial like instructions showed how to install the pwa").
 * Where the browser will install it itself, **Install** asks it to; the steps
 * for this device follow either way, each with the mark the device shows
 * for it. A bottom sheet on a phone and a dialog from 768 px.
 */
export function InstallAppSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { canPrompt, platform, install } = useInstallApp();
  const steps = text.steps[platform];
  const icons = STEP_ICONS[platform];

  return (
    <Sheet open={open} onClose={onClose} title={text.title}>
      <div className="space-y-5 pb-2">
        <p className="text-sm text-text-muted">{text.intro}</p>

        {canPrompt && (
          <Button
            label={text.installNow}
            icon={Download}
            size="lg"
            fullWidth
            onClick={() => void install().then((taken) => taken && onClose())}
          />
        )}

        <section aria-labelledby="install-steps" className="space-y-3">
          <h3 id="install-steps" className="font-body text-xs font-semibold uppercase tracking-wider text-text-muted">
            {canPrompt ? text.orFollow : text.stepsFor[platform]}
          </h3>
          <ol className="space-y-2">
            {steps.map((step, index) => {
              const Icon = icons[index];
              return (
                <li key={step} className="flex items-center gap-3 rounded-2xl bg-sunken p-3">
                  <span
                    aria-hidden="true"
                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-text"
                  >
                    {index + 1}
                  </span>
                  <p className="min-w-0 flex-1 text-sm text-text">{step}</p>
                  <Icon size={20} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-primary" />
                </li>
              );
            })}
          </ol>
        </section>

        <p className="text-xs text-text-muted">{text.done}</p>
      </div>
    </Sheet>
  );
}
