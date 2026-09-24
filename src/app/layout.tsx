import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
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
  // Fraunces is variable: naming axes means the weight range comes with it,
  // and next/font rejects a fixed weight list alongside them.
  axes: ["SOFT", "WONK", "opsz"],
});

/** Everything you operate — labels, body, inputs, buttons, money in rows. */
const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ovenly — Home Bakery Management",
  description:
    "Mobile-first management platform for home bakers. Manage orders, customers, inventory, expenses, and bills effortlessly.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // The boot script swaps this for the stored theme's before the first paint.
  themeColor: THEME_COLORS[DEFAULT_THEME],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
