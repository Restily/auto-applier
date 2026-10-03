import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { renderWithIntl, stubBrowserApis } from "@/components/shell/test-utils";
import type { ResumeState } from "@/lib/resume/status";

import { ResumeFlow } from "./resume-flow";

beforeAll(stubBrowserApis);

const ID = "11111111-1111-4111-8111-111111111111";
const resume = (over: Partial<ResumeState> = {}): ResumeState => ({ id: ID, fileName: "cv.pdf", status: "processing", errorCode: null, extracted: null, ...over });
const OUT = { id: ID, file_name: "cv.pdf", status: "processing" as const, error_code: null, mime_type: "application/pdf", size_bytes: 8, created_at: "" };
const pdf = (): File => new File(["%PDF-1.4"], "cv.pdf", { type: "application/pdf" });
const input = (): HTMLInputElement => document.querySelector("input[type=file]") as HTMLInputElement;

describe("ResumeFlow", () => {
  it("uploads, polls until ready and reports the ready resume", async () => {
    const onReady = vi.fn();
    const upload = vi.fn().mockResolvedValue({ ok: true, resume: OUT });
    const read = vi.fn().mockResolvedValue(resume({ status: "ready", extracted: { full_name: "A" } }));
    await renderWithIntl(<ResumeFlow initial={null} manualHref="/onboarding/profile" onReady={onReady} deps={{ upload, read, retry: vi.fn() }} />);
    await userEvent.setup().upload(input(), pdf());
    await waitFor(() => expect(onReady).toHaveBeenCalledWith(expect.objectContaining({ id: ID, status: "ready" })));
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it("shows the extraction status in a polite live region while processing", async () => {
    const upload = vi.fn().mockResolvedValue({ ok: true, resume: OUT });
    const read = vi.fn().mockResolvedValue(resume());
    await renderWithIntl(<ResumeFlow initial={null} manualHref="/x" onReady={vi.fn()} deps={{ upload, read, retry: vi.fn() }} />);
    await userEvent.setup().upload(input(), pdf());
    const status = await screen.findByText("Reading your resume…");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText("This can take up to a minute.")).toBeInTheDocument();
  });

  it("a failed extraction shows the failure panel; Try again restarts and polls", async () => {
    const upload = vi.fn().mockResolvedValue({ ok: true, resume: OUT });
    const read = vi.fn().mockResolvedValueOnce(resume({ status: "failed", errorCode: "unreadable" })).mockResolvedValue(resume({ status: "ready" }));
    const retry = vi.fn().mockResolvedValue({ ok: true });
    const onReady = vi.fn();
    const user = userEvent.setup();
    await renderWithIntl(<ResumeFlow initial={null} manualHref="/x" onReady={onReady} deps={{ upload, read, retry }} />);
    await user.upload(input(), pdf());
    await screen.findByRole("heading", { name: "We couldn't read this resume" });
    expect(screen.getByText(/cv\.pdf stays attached/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledWith(ID);
    await waitFor(() => expect(onReady).toHaveBeenCalled());
  });

  it("starts on the failure panel when the existing resume already failed", async () => {
    await renderWithIntl(<ResumeFlow initial={resume({ status: "failed", errorCode: "ai_failed" })} manualHref="/x" onReady={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "We couldn't read this resume" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fill in manually" })).toHaveAttribute("href", "/x");
  });

  it("a server rejection returns to the dropzone with the message", async () => {
    const upload = vi.fn().mockResolvedValue({ ok: false, error: "resume.too_large" });
    await renderWithIntl(<ResumeFlow initial={null} manualHref="/x" onReady={vi.fn()} deps={{ upload, read: vi.fn(), retry: vi.fn() }} />);
    await userEvent.setup().upload(input(), pdf());
    expect(await screen.findByRole("alert")).toHaveTextContent("This file is larger than 5 MB");
    expect(screen.getByRole("button", { name: /Upload your resume/ })).toBeEnabled();
  });

  it("a failed retry keeps the panel and says so", async () => {
    const retry = vi.fn().mockResolvedValue({ ok: false });
    const user = userEvent.setup();
    await renderWithIntl(<ResumeFlow initial={resume({ status: "failed" })} manualHref="/x" onReady={vi.fn()} deps={{ upload: vi.fn(), read: vi.fn(), retry }} />);
    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Try again" }));
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't restart/);
  });

  it("offers Fill in manually on the upload step only when asked", async () => {
    await renderWithIntl(<ResumeFlow initial={null} manualHref="/onboarding/profile" onReady={vi.fn()} showManualLink />);
    expect(screen.getByRole("link", { name: "Fill in manually instead" })).toHaveAttribute("href", "/onboarding/profile");
  });
});
