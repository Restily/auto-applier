import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const exchange = vi.fn();
vi.mock("@/lib/auth/actions", () => ({ exchangeOAuthCodeAction: (...a: unknown[]) => exchange(...a) }));
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

import { renderWithIntl } from "@/components/shell/test-utils";

import { OAuthCallback } from "./oauth-callback";

beforeEach(() => vi.clearAllMocks());

describe("OAuthCallback", () => {
  it("announces progress and replaces the route with the exchange result", async () => {
    exchange.mockResolvedValue({ redirectTo: "/onboarding?welcome=1" });
    await renderWithIntl(<OAuthCallback code="abc" />);
    expect(screen.getByText("Signing you in…")).toHaveAttribute("aria-live", "polite");
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/onboarding?welcome=1"));
    expect(exchange).toHaveBeenCalledTimes(1);
    expect(exchange).toHaveBeenCalledWith("abc");
  });

  it("a thrown exchange goes to oauth_failed", async () => {
    exchange.mockRejectedValue(new Error("boom"));
    await renderWithIntl(<OAuthCallback code="abc" />, "ru");
    expect(screen.getByText("Выполняется вход…")).toBeInTheDocument();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/sign-in?notice=oauth_failed"));
  });
});
