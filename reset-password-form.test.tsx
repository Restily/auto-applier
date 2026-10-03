import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const updatePasswordAction = vi.fn();
vi.mock("@/lib/auth/actions", () => ({ updatePasswordAction: (...a: unknown[]) => updatePasswordAction(...a) }));

import { renderWithIntl } from "@/components/shell/test-utils";

import { ResetPasswordForm } from "./reset-password-form";

beforeEach(() => {
  vi.clearAllMocks();
  updatePasswordAction.mockResolvedValue({ status: "idle" });
});

describe("ResetPasswordForm", () => {
  it("expired panel replaces the form when the link is invalid", async () => {
    await renderWithIntl(<ResetPasswordForm linkInvalid />);
    expect(screen.getByRole("heading", { name: "This link has expired" })).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Password/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save new password" })).not.toBeInTheDocument();
  });

  it("Request a new link goes to forgot password", async () => {
    await renderWithIntl(<ResetPasswordForm linkInvalid />);
    expect(screen.getByRole("link", { name: "Request a new link" })).toHaveAttribute("href", "/sign-in/forgot-password");
  });

  it("valid link shows the password form with the requirement line", async () => {
    const user = userEvent.setup();
    await renderWithIntl(<ResetPasswordForm linkInvalid={false} />);
    expect(screen.getByRole("heading", { level: 1, name: "Choose a new password" })).toBeInTheDocument();
    const submit = screen.getByRole("button", { name: "Save new password" });
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText(/^Password/), "12345678");
    expect(screen.getByText("At least 8 characters").closest("[data-met]")).toHaveAttribute("data-met", "true");
    await user.click(submit);
    await waitFor(() => expect(updatePasswordAction).toHaveBeenCalled());
  });

  it("blocks a too-short password on the client", async () => {
    const user = userEvent.setup();
    await renderWithIntl(<ResetPasswordForm linkInvalid={false} />);
    await user.type(screen.getByLabelText(/^Password/), "short");
    await user.click(screen.getByRole("button", { name: "Save new password" }));
    expect(await screen.findAllByText("At least 8 characters")).not.toHaveLength(0);
    expect(screen.getByLabelText(/^Password/)).toHaveAttribute("aria-invalid", "true");
    expect(updatePasswordAction).not.toHaveBeenCalled();
  });

  it("renders RU expired copy", async () => {
    await renderWithIntl(<ResetPasswordForm linkInvalid />, "ru");
    expect(screen.getByRole("heading", { name: "Ссылка недействительна" })).toBeInTheDocument();
  });
});
