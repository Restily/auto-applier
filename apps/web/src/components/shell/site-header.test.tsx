import { screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/actions", () => ({ setLocale: vi.fn() }));
vi.mock("@/lib/auth/sign-out", () => ({ signOutAction: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  usePathname: () => "/profile",
}));

import { SiteHeader } from "@/components/shell/site-header";
import { renderWithIntl, shellData, stubBrowserApis } from "@/components/shell/test-utils";

beforeAll(stubBrowserApis);

describe("SiteHeader", () => {
  it("pre-auth shows logo and language only", async () => {
    await renderWithIntl(<SiteHeader />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByText("AutoApplier")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /language/i })).toHaveTextContent("EN");
    expect(screen.queryByRole("button", { name: /credit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /account menu/i })).not.toBeInTheDocument();
  });

  it('signed-in shows "20 credits"', async () => {
    await renderWithIntl(<SiteHeader data={shellData({ balance: 20 })} />);

    expect(screen.getByRole("button", { name: /20 credits/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Account menu" })).toBeInTheDocument();
  });

  it('signed-in shows "20 кредитов" in Russian', async () => {
    await renderWithIntl(<SiteHeader data={shellData({ balance: 20, locale: "ru" })} />, "ru");

    expect(screen.getByRole("button", { name: /20 кредитов/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /язык/i })).toHaveTextContent("RU");
  });

  it("zero balance shows warning icon and text", async () => {
    await renderWithIntl(<SiteHeader data={shellData({ balance: 0 })} />);

    const trigger = screen.getByRole("button", { name: /0 credits/ });
    expect(trigger).toHaveTextContent("0 credits");
    expect(trigger.querySelector("svg.lucide-triangle-alert")).not.toBeNull();
  });

  it("normal balance has no warning icon", async () => {
    await renderWithIntl(<SiteHeader data={shellData({ balance: 20 })} />);

    expect(screen.getByRole("button", { name: /20 credits/ }).querySelector("svg.lucide-triangle-alert")).toBeNull();
  });
});
