import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithIntl } from "@/components/shell/test-utils";
import { checklistView } from "@/lib/profile/completeness";
import { emptyProfile } from "@/lib/profile/schema";

import { Checklist } from "./checklist";

const partial = () => checklistView({ ...emptyProfile(""), fullName: "Alex", targetTitles: ["QA"], yearsExperience: "3_5" });
const done = () =>
  checklistView({ ...emptyProfile("a@example.test"), fullName: "Alex", targetTitles: ["QA"], skills: ["TS"], yearsExperience: "3_5" });

describe("Checklist", () => {
  it("not started shows the default body and Get started", async () => {
    await renderWithIntl(<Checklist view={checklistView(null)} />);
    expect(screen.getByRole("heading", { level: 1, name: "Let's get you set up" })).toBeInTheDocument();
    expect(screen.getByText("Upload a resume or fill it in — takes about 2 minutes.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute("href", "/onboarding/resume");
    expect(screen.queryByText(/Missing/)).not.toBeInTheDocument();
  });

  it('partial shows exactly "Missing: contact email, at least one skill"', async () => {
    await renderWithIntl(<Checklist view={partial()} />);
    expect(screen.getByText("Missing: contact email, at least one skill")).toBeInTheDocument();
    expect(screen.queryByText(/takes about 2 minutes/)).not.toBeInTheDocument();
  });

  it('RU partial shows "Не хватает: …"', async () => {
    await renderWithIntl(<Checklist view={partial()} />, "ru");
    expect(screen.getByText("Не хватает: email для связи, минимум один навык")).toBeInTheDocument();
  });

  it("complete shows Done, Edit profile and the all-done block", async () => {
    await renderWithIntl(<Checklist view={done()} />);
    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit profile" })).toHaveAttribute("href", "/profile");
    expect(screen.getByRole("heading", { name: "You're all set." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to your profile" })).toHaveAttribute("href", "/profile");
    expect(screen.queryByRole("link", { name: "Get started" })).not.toBeInTheDocument();
  });

  it("the all-done block is absent while incomplete", async () => {
    await renderWithIntl(<Checklist view={checklistView(null)} />);
    expect(screen.queryByText("You're all set.")).not.toBeInTheDocument();
  });

  it("progress has aria-valuenow and a text name", async () => {
    const { unmount } = await renderWithIntl(<Checklist view={checklistView(null)} />);
    const bar = screen.getByRole("progressbar", { name: "0 of 1 steps complete" });
    expect(bar).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByText("0 of 1 steps complete")).toBeInTheDocument();
    unmount();

    await renderWithIntl(<Checklist view={done()} />);
    expect(screen.getByRole("progressbar", { name: "1 of 1 steps complete" })).toHaveAttribute("aria-valuenow", "100");
  });
});
