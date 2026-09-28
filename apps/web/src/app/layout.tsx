import type { Metadata } from "next";
import localFont from "next/font/local";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${golosSansLatin.variable} ${golosSansCyrillic.variable} ${plexMono.variable}`}
    >
      <body className="antialiased">
        <a
          href="#main"
          className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-primary focus-visible:px-4 focus-visible:py-2 focus-visible:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Skip to main content
        </a>
        <header className="flex h-[var(--shell-header-height)] items-center border-b border-border bg-card px-[var(--shell-gutter-mobile)]">
          <span className="text-[length:var(--text-h3-size)] font-semibold leading-[var(--text-h3-line)] text-foreground">
            AutoApplier
          </span>
        </header>
        <main id="main">{children}</main>
      </body>
    </html>
  );
}
