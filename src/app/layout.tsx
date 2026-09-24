import type { Metadata, Viewport } from "next";
import { Fraunces, Fredoka, Plus_Jakarta_Sans } from "next/font/google";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

/**
 * The display voice of the Flour Room direction (plan §137): an old-style
 * serif with an optical-size axis, so the same face can carry a 34px headline
 * and a 17px card title without either looking like the other scaled.
 */
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  // Fraunces is variable: naming axes means the weight range comes with it,
  // and next/font rejects a fixed weight list alongside them.
  axes: ["SOFT", "WONK", "opsz"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Ovenly — Home Bakery Management",
  description:
    "Mobile-first management platform for home bakers. Manage orders, customers, inventory, expenses, and bills effortlessly.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#6B4226",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="clean"
      suppressHydrationWarning
      className={`${fredoka.variable} ${plusJakartaSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
