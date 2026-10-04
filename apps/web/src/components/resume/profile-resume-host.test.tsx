import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithIntl, stubBrowserApis } from "@/components/shell/test-utils";
import { emptyProfile, type ProfileInput } from "@/lib/profile/schema";
import type { ResumeState } from "@/lib/resume/status";

const saveProfile = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/profile/actions", () => ({ saveProfile: (...a: unknown[]) => saveProfile(...a) }));
vi.mock("@/lib/resume/actions", () => ({ retryResumeExtraction: vi.fn() }));
vi.mock("@/lib/resume/read-client", () => ({ readResume: vi.fn() }));
vi.mock("sonner", () => ({ toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }));

import { retryResumeExtraction } from "@/lib/resume/actions";
import { readResume } from "@/lib/resume/read-client";

import { ProfileResumeHost } from "./profile-resume-host";

beforeAll(stubBrowserApis);
beforeEach(() => saveProfile.mockReset().mockResolvedValue({ ok: true, isComplete: true, missing: [] }));

const RID = "22222222-2222-4222-8222-222222222222";
const ready = (extracted: unknown): ResumeState => ({ id: RID, fileName: "resume-v2.docx", status: "ready", errorCode: null, extracted });
const saved = (over: Partial<ProfileInput> = {}): ProfileInput => ({ ...emptyProfile("a@example.test"), ...over });

describe("ProfileResumeHost", () => {
  it("fills an empty profile from the draft and shows the banner (nothing is written)", async () => {
    await renderWithIntl(<ProfileResumeHost saved={saved()} resume={ready({ full_name: "Alex Ivanov", skills: ["Go"] })} mode="app" />);
    expect(screen.getByLabelText(/^Full name/)).toHaveValue("Alex Ivanov");
    expect(screen.getByText("We filled this from resume-v2.docx — check it over.")).toBeInTheDocument();
    expect(saveProfile).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("with a saved profile and differences it opens Review changes with Keep current selected (AC4)", async () => {
    const cur = saved({ fullName: "Alex Ivanov", skills: ["Python"] });
    await renderWithIntl(<ProfileResumeHost saved={cur} resume={ready({ full_name: "Alex Ivanov", skills: ["Go"] })} mode="app" />);
    const dialog = await screen.findByRole("dialog", { name: "Review changes from your new resume" });
    expect(dialog).toBeInTheDocument();
    expect(screen.getAllByRole("group")).toHaveLength(1);
    expect(screen.getByRole("radio", { name: /Keep current/ })).toBeChecked();
    // the editor still shows the saved values behind the dialog
    expect(saveProfile).not.toHaveBeenCalled();
  });

  it("Apply with the default choice keeps the current fields; nothing is written until Save", async () => {
    const user = userEvent.setup();
    const cur = saved({ fullName: "Alex Ivanov", skills: ["Python"] });
    await renderWithIntl(<ProfileResumeHost saved={cur} resume={ready({ skills: ["Go"] })} mode="app" />);
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Remove Python" })).toBeInTheDocument();
    expect(saveProfile).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(saveProfile).toHaveBeenCalledTimes(1));
    expect(saveProfile.mock.calls[0]?.[0]).toMatchObject({ skills: ["Python"], sourceResumeId: RID });
  });

  it("choosing Use new for one field changes only that field after Save", async () => {
    const user = userEvent.setup();
    const cur = saved({ fullName: "Alex Ivanov", location: "Berlin", skills: ["Python"] });
    await renderWithIntl(<ProfileResumeHost saved={cur} resume={ready({ full_name: "Alexander", location: "Paris", skills: ["Go"] })} mode="app" />);
    await screen.findByRole("dialog");
    const { within } = await import("@testing-library/react");
    await user.click(within(screen.getByRole("group", { name: "Skills" })).getByRole("radio", { name: /Use new/ }));
    await user.click(screen.getByRole("button", { name: "Apply" }));
    await user.click(await screen.findByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(saveProfile).toHaveBeenCalled());
    expect(saveProfile.mock.calls[0]?.[0]).toMatchObject({ fullName: "Alex Ivanov", location: "Berlin", skills: ["Go"], sourceResumeId: RID });
  });

  it("an identical draft is saved silently with the resume id and no dialog", async () => {
    const cur = saved({ fullName: "Alex Ivanov" });
    await renderWithIntl(<ProfileResumeHost saved={cur} resume={ready({ full_name: "Alex Ivanov" })} mode="app" />);
    await waitFor(() => expect(saveProfile).toHaveBeenCalledTimes(1));
    expect(saveProfile.mock.calls[0]?.[0]).toMatchObject({ fullName: "Alex Ivanov", sourceResumeId: RID });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the attached file, Replace resume, and Try again for a failed resume", async () => {
    const failed: ResumeState = { id: RID, fileName: "scanned.pdf", status: "failed", errorCode: "unreadable", extracted: null };
    await renderWithIntl(<ProfileResumeHost saved={saved()} resume={failed} mode="onboarding" />);
    expect(screen.getByText("We couldn't read scanned.pdf.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Replace resume" })).toBeInTheDocument();
  });

  it("Replace resume opens the upload flow in a dialog", async () => {
    const user = userEvent.setup();
    await renderWithIntl(<ProfileResumeHost saved={saved({ fullName: "A" })} resume={{ ...ready({}), extracted: {} }} mode="app" />);
    await user.click(screen.getByRole("button", { name: "Replace resume" }));
    const dialog = await screen.findByRole("dialog", { name: "Replace resume" });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Upload your resume/ })).toBeInTheDocument();
  });

  it("offers Upload a resume when the user never uploaded one", async () => {
    await renderWithIntl(<ProfileResumeHost saved={saved()} resume={null} mode="app" />);
    expect(screen.getByRole("button", { name: "Upload a resume" })).toBeInTheDocument();
  });

  it("Try again that gets a 409 (already being extracted) goes back to polling, not to the retry-failed error (M1 review #2)", async () => {
    vi.mocked(retryResumeExtraction).mockResolvedValue({ ok: false, conflict: true });
    vi.mocked(readResume).mockReset();
    const failed: ResumeState = { id: RID, fileName: "scanned.pdf", status: "failed", errorCode: "unreadable", extracted: null };
    await renderWithIntl(<ProfileResumeHost saved={saved()} resume={failed} mode="app" />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Reading scanned.pdf…")).toBeInTheDocument();
    expect(screen.queryByText(/couldn't restart/)).not.toBeInTheDocument();
  });
});

describe("ProfileResumeHost with unsaved edits (M1 review #13)", () => {
  const processing: ResumeState = { id: RID, fileName: "resume-v2.docx", status: "processing", errorCode: null, extracted: null };

  /** The resume finishes extracting after the user has started typing. */
  async function renderAndFinishWhileEditing(savedProfile: ProfileInput, extracted: unknown): Promise<void> {
    let finish: (r: ResumeState) => void = () => undefined;
    vi.mocked(readResume).mockReset().mockReturnValue(new Promise<ResumeState>((resolve) => (finish = resolve)));
    await renderWithIntl(<ProfileResumeHost saved={savedProfile} resume={processing} mode="app" />);
    await userEvent.setup().type(screen.getByLabelText(/^Phone/), "+49 123");
    finish(ready(extracted));
  }

  it("asks before replacing unsaved edits, and Keep my edits leaves the editor untouched", async () => {
    const user = userEvent.setup();
    await renderAndFinishWhileEditing(saved(), { full_name: "Alex Ivanov" });
    const dialog = await screen.findByRole("dialog", { name: "Replace your unsaved changes?" });
    expect(dialog).toHaveTextContent("resume-v2.docx");
    expect(screen.getByRole("button", { name: "Keep my edits" })).toHaveFocus();
    expect(screen.getByLabelText(/^Phone/)).toHaveValue("+49 123");

    await user.click(screen.getByRole("button", { name: "Keep my edits" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByLabelText(/^Phone/)).toHaveValue("+49 123");
    expect(screen.getByLabelText(/^Full name/)).toHaveValue("");
    expect(saveProfile).not.toHaveBeenCalled();
  });

  it("Use the new resume fills the editor after the explicit confirmation", async () => {
    const user = userEvent.setup();
    await renderAndFinishWhileEditing(saved(), { full_name: "Alex Ivanov" });
    await screen.findByRole("dialog", { name: "Replace your unsaved changes?" });
    await user.click(screen.getByRole("button", { name: "Use the new resume" }));
    await waitFor(() => expect(screen.getByLabelText(/^Full name/)).toHaveValue("Alex Ivanov"));
    expect(screen.getByText("We filled this from resume-v2.docx — check it over.")).toBeInTheDocument();
  });

  it("with a saved profile the confirmation comes before the Review changes dialog", async () => {
    const user = userEvent.setup();
    await renderAndFinishWhileEditing(saved({ fullName: "Alex Ivanov", skills: ["Python"] }), { skills: ["Go"] });
    await screen.findByRole("dialog", { name: "Replace your unsaved changes?" });
    expect(screen.queryByRole("dialog", { name: "Review changes from your new resume" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Use the new resume" }));
    expect(await screen.findByRole("dialog", { name: "Review changes from your new resume" })).toBeInTheDocument();
  });

  it("no confirmation when the editor is clean", async () => {
    let finish: (r: ResumeState) => void = () => undefined;
    vi.mocked(readResume).mockReset().mockReturnValue(new Promise<ResumeState>((resolve) => (finish = resolve)));
    await renderWithIntl(<ProfileResumeHost saved={saved()} resume={processing} mode="app" />);
    finish(ready({ full_name: "Alex Ivanov" }));
    await waitFor(() => expect(screen.getByLabelText(/^Full name/)).toHaveValue("Alex Ivanov"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("ProfileResumeHost after Apply (B-005)", () => {
  async function applyReview(user: ReturnType<typeof userEvent.setup>) {
    const cur = saved({ fullName: "Alex Ivanov", skills: ["Python"] });
    await renderWithIntl(<ProfileResumeHost saved={cur} resume={ready({ skills: ["Go"] })} mode="app" />);
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("radio", { name: /Use new/ }));
    await user.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  }

  it("makes the editor dirty: Unsaved changes shown, beforeunload armed, applied hint rendered", async () => {
    const user = userEvent.setup();
    await applyReview(user);
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    expect(screen.getByText("Review the highlighted changes and save when you're happy.")).toBeInTheDocument();
    const evt = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(evt);
    expect(evt.defaultPrevented).toBe(true);
  });

  it("Apply with Keep everything current is still dirty (the resume link is unsaved)", async () => {
    const user = userEvent.setup();
    const cur = saved({ fullName: "Alex Ivanov", skills: ["Python"] });
    await renderWithIntl(<ProfileResumeHost saved={cur} resume={ready({ skills: ["Go"] })} mode="app" />);
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
  });

  it("after Save the indicator and the hint go away and beforeunload is disarmed", async () => {
    const user = userEvent.setup();
    await applyReview(user);
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(saveProfile).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument());
    expect(screen.queryByText("Review the highlighted changes and save when you're happy.")).not.toBeInTheDocument();
    const evt = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(evt);
    expect(evt.defaultPrevented).toBe(false);
  });

  it("renders the hint in Russian", async () => {
    const user = userEvent.setup();
    const cur = saved({ fullName: "Alex Ivanov", skills: ["Python"] });
    await renderWithIntl(<ProfileResumeHost saved={cur} resume={ready({ skills: ["Go"] })} mode="app" />, "ru");
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Применить" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("Проверьте изменения и сохраните, когда всё устраивает.")).toBeInTheDocument();
  });
});
