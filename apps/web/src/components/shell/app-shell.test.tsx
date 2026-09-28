import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/actions", () => ({ setLocale: vi.fn() }));
vi.mock("@/lib/auth/sign-out", () => ({ signOutAction: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  usePathname: () => "/profile",
}));

import { AppShell } from "@/components/shell/app-shell";
import { FocusShell } from "@/components/shell/focus-shell";
import { renderWithIntl, shellData, stubBrowserApis } from "@/components/shell/test-utils";

beforeAll(stubBrowserApis);

describe("AppShell", () => {
  it("renders only Profile and Settings nav items", async () => {
    await renderWithIntl(
      <AppShell data={shellData()}>
        <p>content</p>
      </AppShell>,
    );

    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(["Profile", "Settings"]);
  });

  it("active item has aria-current=page", async () => {
    await renderWithIntl(
      <AppShell data={shellData()}>
        <p>content</p>
      </AppShell>,
    );

    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(within(nav).getByRole("link", { name: "Profile" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Settings" })).not.toHaveAttribute("aria-current");
  });

  it("skip link is the first focusable element", async () => {
    const user = userEvent.setup();
    await renderWithIntl(
      <AppShell data={shellData()}>
        <p>content</p>
      </AppShell>,
    );

    await user.tab();
    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveFocus();
    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute("href", "#main");
    expect(document.getElementById("main")).not.toBeNull();
  });

  it("account menu has Settings and Sign out", async () => {
    const user = userEvent.setup();
    await renderWithIntl(
      <AppShell data={shellData()}>
        <p>content</p>
      </AppShell>,
    );

    await user.click(screen.getByRole("button", { name: "Account menu" }));
    expect(screen.getByRole("menuitem", { name: "Settings" })).toHaveAttribute("href", "/settings");
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Complete your profile" })).not.toBeInTheDocument();
  });

  it("account menu offers Complete your profile while onboarding is incomplete", async () => {
    const user = userEvent.setup();
    await renderWithIntl(
      <AppShell data={shellData({ onboardingComplete: false })}>
        <p>content</p>
      </AppShell>,
    );

    await user.click(screen.getByRole("button", { name: "Account menu" }));
    expect(screen.getByRole("menuitem", { name: "Complete your profile" })).toHaveAttribute("href", "/onboarding");
  });
});

describe("FocusShell", () => {
  it("has a skip link, banner and main landmark and no navigation", async () => {
    await renderWithIntl(
      <FocusShell>
        <p>content</p>
      </FocusShell>,
    );

    expect(screen.getByRole("link", { name: "Skip to content" })).toBeInTheDocument();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("content");
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});
