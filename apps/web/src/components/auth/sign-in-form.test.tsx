import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const signInAction = vi.fn();
vi.mock("@/lib/auth/actions", () => ({
  signInAction: (...args: unknown[]) => signInAction(...args),
  startGoogleSignInAction: vi.fn(),
}));
const { toastMessage } = vi.hoisted(() => ({ toastMessage: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: toastMessage, message: toastMessage } }));

import { renderWithIntl } from "@/components/shell/test-utils";

import { SignInForm } from "./sign-in-form";

beforeEach(() => {
  vi.clearAllMocks();
  signInAction.mockResolvedValue({ status: "idle" });
});

async function fillAndSubmit(): Promise<void> {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/^Email/), "a@example.test");
  await user.type(screen.getByLabelText(/^Password/), "wrong-password");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("SignInForm", () => {
  it("invalid credentials alert gets focus and both fields get danger state", async () => {
    signInAction.mockResolvedValue({ status: "error", formError: "invalid_credentials", email: "a@example.test" });
    await renderWithIntl(<SignInForm googleEnabled={false} />);
    await fillAndSubmit();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Invalid email or password");
    await waitFor(() => expect(alert).toHaveFocus());
    expect(screen.getByLabelText(/^Email/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/^Password/)).toHaveAttribute("aria-invalid", "true");
  });

  it("sends the safe next along with the credentials", async () => {
    await renderWithIntl(<SignInForm googleEnabled={false} next="/profile" />);
    await fillAndSubmit();
    await waitFor(() => expect(signInAction).toHaveBeenCalled());
    expect((signInAction.mock.calls[0]![1] as FormData).get("next")).toBe("/profile");
  });

  it("oauth_cancelled notice renders neutral alert", async () => {
    await renderWithIntl(<SignInForm googleEnabled notice="oauth_cancelled" />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Sign-in with Google was cancelled.");
    await waitFor(() => expect(alert).toHaveFocus());
    expect(screen.getByLabelText(/^Email/)).not.toHaveAttribute("aria-invalid", "true");
  });

  it("oauth_failed shows the error pattern with Try again", async () => {
    await renderWithIntl(<SignInForm googleEnabled notice="oauth_failed" />);
    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute("href", "/sign-in");
  });

  it("password_updated and session_expired notices fire a toast", async () => {
    await renderWithIntl(<SignInForm googleEnabled={false} notice="password_updated" />);
    await waitFor(() => expect(toastMessage).toHaveBeenCalledWith("Password updated. Sign in with your new password."));
    toastMessage.mockClear();
    await renderWithIntl(<SignInForm googleEnabled={false} notice="session_expired" />);
    await waitFor(() => expect(toastMessage).toHaveBeenCalledWith("You've been signed out. Sign in again."));
  });

  it("has a forgot-password link and a sign-up link", async () => {
    await renderWithIntl(<SignInForm googleEnabled={false} />);
    expect(screen.getByRole("link", { name: "Forgot password?" })).toHaveAttribute("href", "/sign-in/forgot-password");
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/sign-up");
  });

  it("rate limit shows its own message", async () => {
    signInAction.mockResolvedValue({ status: "error", formError: "rate_limited", email: "a@example.test" });
    await renderWithIntl(<SignInForm googleEnabled={false} />);
    await fillAndSubmit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many attempts");
  });

  it("renders RU", async () => {
    await renderWithIntl(<SignInForm googleEnabled={false} />, "ru");
    expect(screen.getByRole("heading", { level: 1, name: "Войдите в AutoApplier" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Забыли пароль?" })).toBeInTheDocument();
  });
});
