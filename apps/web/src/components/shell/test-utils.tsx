import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";

import type { Locale } from "@/i18n/config";
import { loadMessages } from "@/i18n/messages";
import type { ShellData } from "@/lib/shell/data";

export async function renderWithIntl(ui: ReactElement, locale: Locale = "en") {
  const messages = await loadMessages(locale);
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

export function shellData(overrides: Partial<ShellData> = {}): ShellData {
  return {
    email: "alex@example.test",
    initials: "A",
    balance: 20,
    locale: "en",
    onboardingComplete: true,
    signupBonusGranted: false,
    ...overrides,
  };
}

/** Radix popper/menu primitives need these browser APIs, which jsdom lacks. */
export function stubBrowserApis(): void {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver ??= ResizeObserverStub;
  Element.prototype.scrollIntoView ??= () => {};
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.releasePointerCapture ??= () => {};
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}
