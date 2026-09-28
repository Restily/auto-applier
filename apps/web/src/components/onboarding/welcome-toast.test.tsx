import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadMessages } from "@/i18n/messages";

const replace = vi.fn();
const success = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => success(...a) } }));

import { WelcomeToast } from "./welcome-toast";

async function mount(show: boolean, locale: "en" | "ru" = "en") {
  const messages = await loadMessages(locale);
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <WelcomeToast show={show} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  replace.mockReset();
  success.mockReset();
});

describe("WelcomeToast", () => {
  it('show=true fires the "You\'ve got 20 free credits" toast once (S-001 AC1)', async () => {
    const { rerender } = await mount(true);
    expect(success).toHaveBeenCalledTimes(1);
    expect(success.mock.calls[0]![0]).toBe("You've got 20 free credits");
    rerender(<div />);
    expect(success).toHaveBeenCalledTimes(1);
  });

  it("RU copy", async () => {
    await mount(true, "ru");
    expect(success.mock.calls[0]![0]).toBe("Вам начислено 20 бесплатных кредитов");
  });

  it("show=false fires no credits toast (D5)", async () => {
    await mount(false);
    expect(success).not.toHaveBeenCalled();
  });

  it("strips ?welcome=1 in both cases", async () => {
    await mount(true);
    await mount(false);
    expect(replace).toHaveBeenCalledTimes(2);
    expect(replace).toHaveBeenCalledWith("/onboarding");
  });
});
