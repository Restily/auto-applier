import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithIntl, stubBrowserApis } from "@/components/shell/test-utils";
import { emptyProfile } from "@/lib/profile/schema";

const push = vi.fn();
const saveProfile = vi.fn();
const toastInfo = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/profile/actions", () => ({ saveProfile: (...a: unknown[]) => saveProfile(...a) }));
vi.mock("sonner", () => ({
  toast: { info: (...a: unknown[]) => toastInfo(...a), success: (...a: unknown[]) => toastSuccess(...a), error: (...a: unknown[]) => toastError(...a) },
}));

import { ProfileEditor } from "./profile-editor";

beforeAll(stubBrowserApis);
beforeEach(() => {
  push.mockReset();
  saveProfile.mockReset();
  toastInfo.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
});

const ALL_MISSING = ["fullName", "contactEmail", "targetTitles", "skills", "yearsExperience"];

describe("ProfileEditor", () => {
  it("required fields carry aria-required from the first render", async () => {
    await renderWithIntl(<ProfileEditor initial={emptyProfile("")} mode="app" />);
    for (const name of [/^Full name/, /^Contact email/, /^Target titles/, /^Skills/, /^Years of experience/]) {
      expect(screen.getByLabelText(name)).toHaveAttribute("aria-required", "true");
    }
    expect(screen.getByLabelText(/^Phone/)).not.toHaveAttribute("aria-required");
  });

  it("saving with missing fields shows every missing error and focuses the first in fixed order (AC2)", async () => {
    saveProfile.mockResolvedValue({ ok: true, isComplete: false, missing: ALL_MISSING });
    const user = userEvent.setup();
    await renderWithIntl(<ProfileEditor initial={emptyProfile("")} mode="app" />);

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(5));
    const texts = screen.getAllByRole("alert").map((a) => a.textContent);
    expect(texts).toEqual([
      "This field is required",
      "This field is required",
      "Add at least one target title",
      "Add at least one skill",
      "This field is required",
    ]);
    expect(screen.getByLabelText(/^Full name/)).toHaveFocus();
    expect(screen.getByLabelText(/^Full name/)).toHaveAttribute("aria-invalid", "true");
    expect(toastInfo).toHaveBeenCalledWith("Saved. Fill in the highlighted fields to complete your profile.");
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("focuses the first missing field even when earlier ones are filled", async () => {
    saveProfile.mockResolvedValue({ ok: true, isComplete: false, missing: ["skills", "yearsExperience"] });
    const user = userEvent.setup();
    await renderWithIntl(
      <ProfileEditor initial={{ ...emptyProfile("a@example.test"), fullName: "Alex", targetTitles: ["QA"] }} mode="app" />,
    );
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(screen.getByLabelText(/^Skills/)).toHaveFocus());
  });

  it("invalid email blocks the save", async () => {
    const user = userEvent.setup();
    await renderWithIntl(<ProfileEditor initial={emptyProfile("")} mode="app" />);

    await user.type(screen.getByLabelText(/^Contact email/), "nope");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(saveProfile).not.toHaveBeenCalled();
    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Contact email/)).toHaveFocus();
    expect(toastInfo).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("all format errors show at once and salary max below min is one of them", async () => {
    const user = userEvent.setup();
    await renderWithIntl(<ProfileEditor initial={emptyProfile("")} mode="app" />);
    await user.type(screen.getByLabelText(/^Contact email/), "nope");
    await user.type(screen.getByLabelText(/^LinkedIn/), "nope");
    await user.type(screen.getByLabelText(/^Min/), "500");
    await user.type(screen.getByLabelText(/^Max/), "100");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Max should be greater than min")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid URL")).toBeInTheDocument();
    expect(saveProfile).not.toHaveBeenCalled();
  });

  it("dirty shows Unsaved changes", async () => {
    const user = userEvent.setup();
    await renderWithIntl(<ProfileEditor initial={emptyProfile("")} mode="app" />);
    expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/^Full name/), "A");
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
  });

  it("chip remove button is labelled Remove Playwright", async () => {
    const user = userEvent.setup();
    await renderWithIntl(<ProfileEditor initial={emptyProfile("")} mode="app" />);
    await user.type(screen.getByLabelText(/^Skills/), "Playwright{Enter}");
    const remove = screen.getByRole("button", { name: "Remove Playwright" });
    expect(remove).toBeInTheDocument();
    await user.click(remove);
    expect(screen.queryByRole("button", { name: "Remove Playwright" })).not.toBeInTheDocument();
  });

  it("salary controls are grouped under an Expected salary legend", async () => {
    await renderWithIntl(<ProfileEditor initial={emptyProfile("")} mode="app" />);
    const group = screen.getByRole("group", { name: "Expected salary" });
    expect(group).toContainElement(screen.getByLabelText(/^Min/));
    expect(group).toContainElement(screen.getByLabelText(/^Max/));
  });

  it("complete save in onboarding mode shows Saved and goes to /onboarding", async () => {
    saveProfile.mockResolvedValue({ ok: true, isComplete: true, missing: [] });
    const user = userEvent.setup();
    await renderWithIntl(<ProfileEditor initial={emptyProfile("a@example.test")} mode="onboarding" />);
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/onboarding"));
    expect(toastSuccess).toHaveBeenCalledWith("Saved");
  });

  it("complete save in app mode stays put", async () => {
    saveProfile.mockResolvedValue({ ok: true, isComplete: true, missing: [] });
    const user = userEvent.setup();
    await renderWithIntl(<ProfileEditor initial={emptyProfile("a@example.test")} mode="app" />);
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Saved"));
    expect(push).not.toHaveBeenCalled();
    expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();
  });

  it("a failed save shows an error toast and keeps the form dirty", async () => {
    saveProfile.mockResolvedValue({ ok: false, formError: "save_failed" });
    const user = userEvent.setup();
    await renderWithIntl(<ProfileEditor initial={emptyProfile("")} mode="app" />);
    await user.type(screen.getByLabelText(/^Full name/), "A");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("We couldn't save your profile. Try again."));
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
  });

  it("server field errors are shown inline", async () => {
    saveProfile.mockResolvedValue({ ok: false, fieldErrors: { fullName: "maxLength" } });
    const user = userEvent.setup();
    await renderWithIntl(<ProfileEditor initial={emptyProfile("")} mode="app" />);
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("This is too long")).toBeInTheDocument();
  });

  it("adds an experience entry through its dialog", async () => {
    const user = userEvent.setup();
    await renderWithIntl(<ProfileEditor initial={emptyProfile("")} mode="app" />);
    await user.click(screen.getByRole("button", { name: "+ Add experience" }));
    const dialog = await screen.findByRole("dialog", { name: "Add experience" });
    await user.type(screen.getByLabelText(/^Job title/), "QA Lead");
    await user.type(screen.getByLabelText(/^Company/), "Acme");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect(screen.getByText(/QA Lead · Acme/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove QA Lead · Acme" })).toBeInTheDocument();
    expect(saveProfile).not.toHaveBeenCalled();
  });

  it("shows the filled-from-resume banner and lets the user dismiss it", async () => {
    const user = userEvent.setup();
    await renderWithIntl(<ProfileEditor initial={emptyProfile("")} mode="app" bannerFileName="cv.pdf" headerSlot={<p>slot</p>} />);
    expect(screen.getByText("We filled this from cv.pdf — check it over.")).toBeInTheDocument();
    expect(screen.getByText("slot")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText(/We filled this from/)).not.toBeInTheDocument();
  });

  it("RU labels render", async () => {
    await renderWithIntl(<ProfileEditor initial={emptyProfile("")} mode="app" />, "ru");
    expect(screen.getByLabelText(/^Полное имя/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email для связи/)).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Ожидаемая зарплата" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Сохранить изменения" })).toBeInTheDocument();
  });
});
