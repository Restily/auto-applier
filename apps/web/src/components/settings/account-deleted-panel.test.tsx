import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithIntl } from "@/components/shell/test-utils";

import { AccountDeletedPanel } from "./account-deleted-panel";

describe("AccountDeletedPanel", () => {
  it("focuses the h1, offers sign-up and links the D5 note to the privacy section", async () => {
    await renderWithIntl(<AccountDeletedPanel />);
    const h1 = screen.getByRole("heading", { level: 1, name: "Your account has been deleted" });
    await waitFor(() => expect(h1).toHaveFocus());
    expect(screen.getByText("All your data has been permanently removed.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create a new account" })).toHaveAttribute("href", "/sign-up");
    expect(screen.getByText(/starts without the free sign-up credits/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy policy" })).toHaveAttribute("href", "/privacy#after-deletion");
  });
});
