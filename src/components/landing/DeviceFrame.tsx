import Image, { type StaticImageData } from "next/image";

import { cn } from "@/components/ui/cn";

interface Shot {
  src: StaticImageData;
  alt: string;
  /** What the browser is told about the drawn width, for picking a file. */
  sizes: string;
  /** The first thing the page shows: fetched first, never lazily. */
  lead?: boolean;
  className?: string;
}

const PHONE_BUTTONS = ["action", "volume-up", "volume-down", "side", "camera"] as const;

/**
 * A screenshot on a current Pro phone (the user, 2026-09-30: "a phone like
 * framed screenshot like with iphone 18 pro"): the titanium band, the even
 * black border, the Dynamic Island and the buttons are drawn here
 * (globals.css, `.device-phone`); the status bar and the home indicator are
 * in the screenshot itself (scripts/landing-shots.mts). The frame is the
 * picture's, so only the picture is named.
 */
export function PhoneFrame({ src, alt, sizes, lead = false, className }: Shot) {
  return (
    <div className={cn("device-phone", className)}>
      <div className="device-phone-body">
        {PHONE_BUTTONS.map((button) => (
          <span key={button} aria-hidden="true" data-button={button} className="device-phone-button" />
        ))}
        <div className="device-phone-glass">
          <div className="device-phone-screen">
            <Image
              src={src}
              alt={alt}
              fill
              sizes={sizes}
              loading={lead ? "eager" : "lazy"}
              fetchPriority={lead ? "high" : undefined}
              className="object-cover"
            />
            <span aria-hidden="true" className="device-phone-island" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** A screenshot of the app on a computer, on a laptop with a thin black border and an aluminium base. */
export function LaptopFrame({ src, alt, sizes, lead = false, className }: Shot) {
  return (
    <div className={cn("device-laptop", className)}>
      <div className="device-laptop-lid">
        <span aria-hidden="true" className="device-laptop-camera" />
        <div className="device-laptop-screen">
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            loading={lead ? "eager" : "lazy"}
            fetchPriority={lead ? "high" : undefined}
            className="object-cover"
          />
        </div>
      </div>
      <div aria-hidden="true" className="device-laptop-base" />
    </div>
  );
}
