import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { renderWithIntl } from "@/components/shell/test-utils";

import PrivacyPage from "./page";

afterEach(() => {
  window.location.hash = "";
});

describe("/privacy placeholder (D5)", () => {
  it("renders the after-deletion section with id after-deletion in EN", async () => {
    await renderWithIntl(<PrivacyPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Privacy policy" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("This is a placeholder.");
    const section = screen.getByRole("region", { name: "What we keep after you delete your account" });
    expect(section).toHaveAttribute("id", "after-deletion");
    expect(section).toHaveTextContent("one-way keyed hash of your email address");
  });

  it('renders the RU heading "Что мы храним после удаления аккаунта"', async () => {
    await renderWithIntl(<PrivacyPage />, "ru");
    expect(screen.getByRole("heading", { level: 2, name: "Что мы храним после удаления аккаунта" })).toBeInTheDocument();
  });

  it("focuses the h1 on plain arrival", async () => {
    await renderWithIntl(<PrivacyPage />);
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toHaveFocus());
  });

  it("focuses the section (not the h1) when arriving via #after-deletion", async () => {
    window.location.hash = "#after-deletion";
    await renderWithIntl(<PrivacyPage />);
    await waitFor(() => expect(screen.getByRole("region", { name: /What we keep/ })).toHaveFocus());
  });
});
