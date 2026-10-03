import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const signUpAction = vi.fn();
vi.mock("@/lib/auth/actions", () => ({
  signUpAction: (...args: unknown[]) => signUpAction(...args),
  startGoogleSignInAction: vi.fn(),
}));

import { renderWithIntl } from "@/components/shell/test-utils";

import { SignUpForm } from "./sign-up-form";

beforeEach(() => {
  vi.clearAllMocks();
  signUpAction.mockResolvedValue({ status: "idle" });
});

describe("SignUpForm", () => {
  it("submit disabled until both fields have content", async () => {
    const user = userEvent.setup();
    await renderWithIntl(<SignUpForm googleEnabled={false} />);
    const submit = screen.getByRole("button", { name: "Sign up" });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/^Email/), "a@example.test");
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText(/^Password/), "x");
    expect(submit).toBeEnabled();
  });

  it("requirement line flips to met at 8 chars and is aria-describedby the password", async () => {
    const user = userEvent.setup();
    await renderWithIntl(<SignUpForm googleEnabled={false} />);
    const password = screen.getByLabelText(/^Password/);
    const requirement = screen.getByText("At least 8 characters").closest("[data-met]")!;

    expect(password.getAttribute("aria-describedby")).toContain(requirement.id);
    expect(requirement).toHaveAttribute("data-met", "false");
    await user.type(password, "1234567");
    expect(requirement).toHaveAttribute("data-met", "false");
    await user.type(password, "8");
    expect(requirement).toHaveAttribute("data-met", "true");
  });

  it("reveal toggle switches the input type", async () => {
    const user = userEvent.setup();
    await renderWithIntl(<SignUpForm googleEnabled={false} />);
    const password = screen.getByLabelText(/^Password/);
    expect(password).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toBeInTheDocument();
  });

  it("client-validates on submit and does not call the action", async () => {
    const user = userEvent.setup();
    await renderWithIntl(<SignUpForm googleEnabled={false} />);
    await user.type(screen.getByLabelText(/^Email/), "not-an-email");
    await user.type(screen.getByLabelText(/^Password/), "12345678");
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email/)).toHaveAttribute("aria-invalid", "true");
    expect(signUpAction).not.toHaveBeenCalled();
  });

  it("submits the entered values to the action", async () => {
    const user = userEvent.setup();
    await renderWithIntl(<SignUpForm googleEnabled={false} />);
    await user.type(screen.getByLabelText(/^Email/), "a@example.test");
    await user.type(screen.getByLabelText(/^Password/), "12345678");
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    await waitFor(() => expect(signUpAction).toHaveBeenCalled());
    const fd = signUpAction.mock.calls[0]![1] as FormData;
    expect(fd.get("email")).toBe("a@example.test");
    expect(fd.get("password")).toBe("12345678");
  });

  it("duplicate alert shows message plus Sign in and Reset password actions, and clears the password", async () => {
    const user = userEvent.setup();
    signUpAction.mockResolvedValue({ status: "error", formError: "duplicate_email", email: "a@example.test" });
    await renderWithIntl(<SignUpForm googleEnabled={false} />);
    await user.type(screen.getByLabelText(/^Email/), "a@example.test");
    await user.type(screen.getByLabelText(/^Password/), "12345678");
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("An account with this email already exists.");
    expect(screen.getAllByRole("link", { name: "Sign in" })[0]).toHaveAttribute("href", "/sign-in");
    expect(screen.getByRole("link", { name: "Reset password" })).toHaveAttribute("href", "/sign-in/forgot-password");
    await waitFor(() => expect(alert).toHaveFocus());
    expect(screen.getByLabelText(/^Email/)).toHaveValue("a@example.test");
    expect(screen.getByLabelText(/^Password/)).toHaveValue("");
  });

  it("no Google button or divider when google=false", async () => {
    await renderWithIntl(<SignUpForm googleEnabled={false} />);
    expect(screen.queryByRole("button", { name: "Continue with Google" })).not.toBeInTheDocument();
    expect(screen.queryByText("or continue with email")).not.toBeInTheDocument();
  });

  it("Google button first when google=true", async () => {
    await renderWithIntl(<SignUpForm googleEnabled />);
    const google = screen.getByRole("button", { name: "Continue with Google" });
    const email = screen.getByLabelText(/^Email/);
    expect(google.compareDocumentPosition(email) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("or continue with email")).toBeInTheDocument();
  });

  it('renders RU heading "Создайте аккаунт"', async () => {
    await renderWithIntl(<SignUpForm googleEnabled={false} />, "ru");
    expect(screen.getByRole("heading", { level: 1, name: "Создайте аккаунт" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Зарегистрироваться" })).toBeInTheDocument();
  });

  it("links to sign in", async () => {
    await renderWithIntl(<SignUpForm googleEnabled={false} />);
    expect(screen.getByText("Already have an account?")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Sign in" })[0]).toHaveAttribute("href", "/sign-in");
  });
});
