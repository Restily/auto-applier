import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requestPasswordResetAction = vi.fn();
vi.mock("@/lib/auth/actions", () => ({
  requestPasswordResetAction: (...a: unknown[]) => requestPasswordResetAction(...a),
}));

import { renderWithIntl } from "@/components/shell/test-utils";

import { ForgotPasswordForm } from "./forgot-password-form";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ForgotPasswordForm", () => {
  it("replaces the form with a neutral confirmation after sending", async () => {
    const user = userEvent.setup();
    requestPasswordResetAction.mockResolvedValue({ status: "sent" });
    await renderWithIntl(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText(/^Email/), "ghost@example.test");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    const heading = await screen.findByRole("heading", { name: "Check your email" });
    expect(heading).toHaveFocus();
    expect(screen.getByText(/If an account exists for this email/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Email/)).not.toBeInTheDocument();
  });

  it("blocks a malformed email on the client", async () => {
    const user = userEvent.setup();
    await renderWithIntl(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText(/^Email/), "nope");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    expect(requestPasswordResetAction).not.toHaveBeenCalled();
  });
});
