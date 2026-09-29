import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { renderWithIntl, stubBrowserApis } from "@/components/shell/test-utils";
import { diffProfile } from "@/lib/profile/merge";
import { emptyProfile, type ProfileInput } from "@/lib/profile/schema";

import { ReviewChangesDialog } from "./review-changes-dialog";

beforeAll(stubBrowserApis);

const current: ProfileInput = { ...emptyProfile("a@example.test"), fullName: "Alex Ivanov", skills: ["Python", "Docker"], location: "Berlin" };
const draft: ProfileInput = { ...current, fullName: "Alexander Ivanov", skills: ["Go", "Rust", "Zig"] };
const diffs = diffProfile(current, draft);

async function open(onApply = vi.fn(), onCancel = vi.fn()) {
  await renderWithIntl(<ReviewChangesDialog open fileName="resume-v2.docx" diffs={diffs} onApply={onApply} onCancel={onCancel} />);
  return { onApply, onCancel };
}

describe("ReviewChangesDialog", () => {
  it("names the file and lists only differing fields", async () => {
    await open();
    expect(screen.getByRole("dialog", { name: "Review changes from your new resume" })).toBeInTheDocument();
    expect(screen.getByText(/differences between your current profile and resume-v2\.docx/)).toBeInTheDocument();
    expect(screen.getAllByRole("group").map((g) => g.querySelector("legend")?.textContent)).toEqual(["Full name", "Skills"]);
    expect(screen.queryByRole("group", { name: "Location" })).not.toBeInTheDocument();
  });

  it("each group has a legend", async () => {
    await open();
    for (const g of screen.getAllByRole("group")) expect(g.querySelector("legend")).not.toBeNull();
    expect(screen.getByRole("group", { name: "Full name" })).toBeInTheDocument();
  });

  it("Keep current is preselected", async () => {
    await open();
    for (const g of screen.getAllByRole("group")) {
      expect(within(g).getByRole("radio", { name: /Keep current/ })).toBeChecked();
      expect(within(g).getByRole("radio", { name: /Use new/ })).not.toBeChecked();
    }
  });

  it("shows the current and new values so the choice is informed", async () => {
    await open();
    const name = screen.getByRole("group", { name: "Full name" });
    expect(within(name).getByText("Alex Ivanov")).toBeInTheDocument();
    expect(within(name).getByText("Alexander Ivanov")).toBeInTheDocument();
  });

  it("Use everything new selects all", async () => {
    const user = userEvent.setup();
    await open();
    await user.click(screen.getByRole("button", { name: "Use everything new" }));
    for (const g of screen.getAllByRole("group")) expect(within(g).getByRole("radio", { name: /Use new/ })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Keep everything current" }));
    for (const g of screen.getAllByRole("group")) expect(within(g).getByRole("radio", { name: /Keep current/ })).toBeChecked();
  });

  it("Apply returns the choices, defaulting the rest to keep", async () => {
    const user = userEvent.setup();
    const { onApply } = await open();
    await user.click(within(screen.getByRole("group", { name: "Skills" })).getByRole("radio", { name: /Use new/ }));
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenCalledWith({ fullName: "keep", skills: "use" });
  });

  it("Escape cancels without applying", async () => {
    const user = userEvent.setup();
    const { onApply, onCancel } = await open();
    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalled();
    expect(onApply).not.toHaveBeenCalled();
  });
});
