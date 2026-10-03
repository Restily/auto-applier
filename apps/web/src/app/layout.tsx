import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import localFont from "next/font/local";

import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Self-hosted per the architect's ruling: @fontsource(-variable) packages +
// next/font/local, never next/font/google — the build must not touch the
// network. Family and weights follow MASTER.md §3.1.
//
// Golos Text Variable ships one file per Unicode subset (no built-in
// unicode-range support in next/font/local), so Latin and Cyrillic are
// loaded as two font-family entries under the same CSS variable; the
// browser falls back per-glyph from the first to the second.
const golosSansLatin = localFont({
  src: "../../../../node_modules/@fontsource-variable/golos-text/files/golos-text-latin-wght-normal.woff2",
  weight: "400 800",
  style: "normal",
  display: "swap",
  variable: "--font-golos-sans",
});

const golosSansCyrillic = localFont({
  src: "../../../../node_modules/@fontsource-variable/golos-text/files/golos-text-cyrillic-wght-normal.woff2",
  weight: "400 800",
  style: "normal",
  display: "swap",
  variable: "--font-golos-sans-cyrillic",
});

// IBM Plex Mono: numerals only (MASTER.md §3.1) — Latin/ASCII subset covers
// digits, so no Cyrillic file is needed here.
const plexMono = localFont({
  src: [
    {
      path: "../../../../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../../../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../../../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: {
    template: "%s · AutoApplier",
    default: "AutoApplier",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${golosSansLatin.variable} ${golosSansCyrillic.variable} ${plexMono.variable}`}
    >
      <body className="antialiased">
        <NextIntlClientProvider>
          {children}
          {/* The design system ships a light theme by default and no theme toggle yet, so pin sonner to it. */}
          <Toaster theme="light" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
