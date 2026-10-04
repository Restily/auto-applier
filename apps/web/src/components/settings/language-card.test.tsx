import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const setLocale = vi.fn();
const refresh = vi.fn();
const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));
vi.mock("@/i18n/actions", () => ({ setLocale: (...a: unknown[]) => setLocale(...a) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("sonner", () => ({ toast: { error: toastError } }));

import { renderWithIntl } from "@/components/shell/test-utils";

import { LanguageCard } from "./language-card";

beforeEach(() => {
  vi.clearAllMocks();
  setLocale.mockResolvedValue({ persisted: true });
});

describe("LanguageCard", () => {
  it("current locale pre-selected, group named by a legend, autonym labels", async () => {
    await renderWithIntl(<LanguageCard />, "ru");
    expect(screen.getByRole("radiogroup", { name: "Язык интерфейса" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Русский" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "English" })).not.toBeChecked();
  });

  it('selecting Русский calls setLocale("ru") (S-005 AC2)', async () => {
    const user = userEvent.setup();
    await renderWithIntl(<LanguageCard />);
    await user.click(screen.getByRole("radio", { name: "Русский" }));
    await waitFor(() => expect(setLocale).toHaveBeenCalledWith("ru"));
    expect(screen.getByRole("radio", { name: "Русский" })).toBeChecked();
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(toastError).not.toHaveBeenCalled();
  });

  it("save-failed toast when not persisted, selection is kept", async () => {
    setLocale.mockResolvedValue({ persisted: false });
    const user = userEvent.setup();
    await renderWithIntl(<LanguageCard />);
    await user.click(screen.getByRole("radio", { name: "Русский" }));
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Language changed here, but we couldn't save it to your account — try again"),
    );
    expect(screen.getByRole("radio", { name: "Русский" })).toBeChecked();
  });
});

describe("LanguageCard follows the active locale (B-006)", () => {
  it("re-selects the radio when the locale changes without a remount (header language menu)", async () => {
    const { rerender } = await renderWithIntl(<LanguageCard />, "ru");
    expect(screen.getByRole("radio", { name: "Русский" })).toBeChecked();
    // Header menu switch: next-intl provider now reports "en"; the stale server prop is still "ru".
    const { NextIntlClientProvider } = await import("next-intl");
    const { loadMessages } = await import("@/i18n/messages");
    rerender(
      <NextIntlClientProvider locale="en" messages={await loadMessages("en")}>
        <LanguageCard />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("radio", { name: "English" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Русский" })).not.toBeChecked();
  });
});
