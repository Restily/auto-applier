import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const setLocale = vi.fn();
vi.mock("@/i18n/actions", () => ({ setLocale: (...args: unknown[]) => setLocale(...args) }));
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { error: (...args: unknown[]) => toastError(...args) } }));

import { LanguageSwitcher } from "@/components/shell/language-switcher";
import { renderWithIntl, stubBrowserApis } from "@/components/shell/test-utils";

beforeAll(stubBrowserApis);
beforeEach(() => {
  vi.clearAllMocks();
  setLocale.mockResolvedValue({ persisted: true });
});

describe("LanguageSwitcher", () => {
  it("trigger shows current code", async () => {
    await renderWithIntl(<LanguageSwitcher locale="en" />);
    expect(screen.getByRole("button", { name: /language/i })).toHaveTextContent("EN");
  });

  it("menu lists English and Русский with current checked", async () => {
    const user = userEvent.setup();
    await renderWithIntl(<LanguageSwitcher locale="ru" />, "ru");
    await user.click(screen.getByRole("button", { name: /язык/i }));

    expect(screen.getByRole("menuitemradio", { name: "English" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("menuitemradio", { name: "Русский" })).toHaveAttribute("aria-checked", "true");
  });

  it("selecting calls setLocale and refreshes", async () => {
    const user = userEvent.setup();
    await renderWithIntl(<LanguageSwitcher locale="en" />);
    await user.click(screen.getByRole("button", { name: /language/i }));
    await user.click(screen.getByRole("menuitemradio", { name: "Русский" }));

    await waitFor(() => expect(setLocale).toHaveBeenCalledWith("ru"));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(toastError).not.toHaveBeenCalled();
  });

  it("shows save-failed toast when persisted is false", async () => {
    setLocale.mockResolvedValue({ persisted: false });
    const user = userEvent.setup();
    await renderWithIntl(<LanguageSwitcher locale="en" />);
    await user.click(screen.getByRole("button", { name: /language/i }));
    await user.click(screen.getByRole("menuitemradio", { name: "Русский" }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(expect.stringContaining("couldn't save it to your account")),
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("does nothing when the current language is chosen", async () => {
    const user = userEvent.setup();
    await renderWithIntl(<LanguageSwitcher locale="en" />);
    await user.click(screen.getByRole("button", { name: /language/i }));
    await user.click(screen.getByRole("menuitemradio", { name: "English" }));

    expect(setLocale).not.toHaveBeenCalled();
  });
});
