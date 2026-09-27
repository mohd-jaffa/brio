import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { ResponseProvider } from "@/components/ui/response-card";
import { UI_TEXT } from "@/constants/messages";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { readInitialSession } from "@/features/auth/session.server";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { PwaSetup } from "@/lib/pwa/PwaSetup";
import { KeyboardInset } from "@/lib/viewport/KeyboardInset";
import { DEFAULT_THEME, THEME_BOOT_SCRIPT, THEME_COLORS } from "@/lib/theme/themes";
import "./globals.css";

/**
 * The display voice (plan §137.4): an old-style serif with an optical-size
 * axis, so the same face carries a 34px headline and a 17px card title
 * without either looking like the other scaled. Headings take it by default;
 * `font-display` names it where a non-heading needs it.
 */
const fraunces = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
  // Fraunces is variable: naming an axis means the weight range comes with it,
  // and next/font rejects a fixed weight list alongside it. Only optical size:
  // nothing sets Fraunces's soft or wonky axes, and each one shipped made
  // every file heavier for no visible change.
  axes: ["opsz"],
});

/** Everything you operate — labels, body, inputs, buttons, money in rows. */
const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: UI_TEXT.appTitle,
  description: UI_TEXT.appDescription,
  applicationName: UI_TEXT.appShortName,
  // Added to an iPhone's home screen, it opens full screen under a
  // see-through status bar, which the safe-area insets pay for (plan §139.8).
  appleWebApp: { capable: true, title: UI_TEXT.appShortName, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lets the safe-area insets reach the page: without "cover", iOS reports
  // them as 0 and every safe-* helper does nothing (BUG-14, plan §139.8).
  viewportFit: "cover",
  // The keyboard resizes the layout instead of covering it, where supported.
  interactiveWidget: "resizes-content",
  // The boot script swaps this for the stored theme's before the first paint.
  themeColor: THEME_COLORS[DEFAULT_THEME],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Drawn knowing who is signed in, so a screen shows in the page's own HTML
  // instead of after the browser has asked (AuthProvider).
  const session = await readInitialSession();
  return (
    <html
      lang="en"
      data-theme={DEFAULT_THEME}
      suppressHydrationWarning
      className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
    >
      <head>
        {/* Sets the stored theme before anything paints (BUG-15). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      {/* Extensions such as Grammarly write attributes onto <body> before React
          hydrates. This ignores only <body>'s own attributes, one level deep;
          a real mismatch anywhere below it is still reported. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider>
          {/* One place every outcome is reported, signed in or not (plan §139.6). */}
          <ResponseProvider>
            <AuthProvider initial={session}>{children}</AuthProvider>
          </ResponseProvider>
          <KeyboardInset />
          <PwaSetup />
        </ThemeProvider>
      </body>
    </html>
  );
}
