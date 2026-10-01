"use client";

import {
  Check,
  Download,
  EllipsisVertical,
  Globe,
  Menu,
  MonitorDown,
  Share,
  SquarePlus,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";

import { BRAND } from "@/assets/brand";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { UI_TEXT } from "@/constants/messages";
import { useInstallApp } from "@/hooks/useInstallApp";
import { isIos, type InstallPlatform } from "@/lib/pwa/install";

const text = UI_TEXT.install;

/** A mark for each step, as the device shows it: the iPhone's Share, Chrome's three dots. */
const IOS_ICONS = [Share, SquarePlus, Check] as const;
const STEP_ICONS: Record<InstallPlatform, readonly LucideIcon[]> = {
  ios: IOS_ICONS,
  iosChrome: IOS_ICONS,
  iosOther: IOS_ICONS,
  android: [Globe, EllipsisVertical, Download],
  desktop: [Globe, MonitorDown, Download],
  other: [Globe, Menu, SquarePlus],
};

/**
 * Installing the app (plan §139.19 R7.3; the user, 2026-09-27: "which will
 * also give small tutorial like instructions showed how to install the pwa").
 * Where the browser will install it itself, **Install** asks it to; the steps
 * for this device follow either way, each with the mark the device shows
 * for it. An iPhone has no Install button to give — Apple lets no website
 * offer one — so it is told why, and shown its own browser's steps (the user,
 * 2026-10-01: in Chrome on an iPhone, the steps sent them to Safari). A bottom
 * sheet on a phone and a dialog from 768 px.
 */
export function InstallAppSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { canPrompt, platform, install } = useInstallApp();
  const steps = text.steps[platform];
  const icons = STEP_ICONS[platform];

  return (
    <Sheet open={open} onClose={onClose} title={text.title}>
      <div className="space-y-5 pb-2">
        {/* The icon it will have on the home screen, beside what installing gives. */}
        <div className="flex items-center gap-4">
          <Image src={BRAND.icon.src} alt="" width={56} height={56} className="size-14 shrink-0" />
          <p className="text-sm text-text-muted">{text.intro}</p>
        </div>

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
          {isIos(platform) && <p className="text-sm text-text-muted">{text.iosNote}</p>}
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
