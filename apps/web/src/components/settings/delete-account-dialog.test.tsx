import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const deleteAccountAction = vi.fn();
vi.mock("@/lib/account/actions", () => ({ deleteAccountAction: (...a: unknown[]) => deleteAccountAction(...a) }));

import { renderWithIntl, stubBrowserApis } from "@/components/shell/test-utils";

import { DeleteAccountDialog } from "./delete-account-dialog";

const EMAIL = "alex@example.test";

beforeEach(() => {
  vi.clearAllMocks();
  stubBrowserApis();
});

async function open() {
  const user = userEvent.setup();
  await renderWithIntl(<DeleteAccountDialog email={EMAIL} />);
  await user.click(screen.getByRole("button", { name: "Delete account" }));
  return user;
}
const confirmButton = () => screen.getByRole("button", { name: "Delete my account" });
const input = () => screen.getByLabelText(/Type your email to confirm/);

describe("DeleteAccountDialog", () => {
  it("confirm disabled on open and focus starts on the input", async () => {
    await open();
    expect(screen.getByRole("alertdialog", { name: "This can't be undone" })).toBeInTheDocument();
    expect(confirmButton()).toBeDisabled();
    await waitFor(() => expect(input()).toHaveFocus());
  });

  it("enables on a case-insensitive trimmed match", async () => {
    const user = await open();
    await user.type(input(), "  ALEX@example.test ");
    expect(confirmButton()).toBeEnabled();
  });

  it("hint only while mismatched and non-empty", async () => {
    const user = await open();
    expect(screen.queryByText("Doesn't match your account email yet")).not.toBeInTheDocument();
    await user.type(input(), "al");
    expect(screen.getByText("Doesn't match your account email yet")).toBeInTheDocument();
    await user.clear(input());
    expect(screen.queryByText("Doesn't match your account email yet")).not.toBeInTheDocument();
    await user.type(input(), EMAIL);
    expect(screen.queryByText("Doesn't match your account email yet")).not.toBeInTheDocument();
  });

  it("Cancel closes, clears input and never calls the action (AC3)", async () => {
    const user = await open();
    await user.type(input(), EMAIL);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete account" }));
    expect(input()).toHaveValue("");
    expect(deleteAccountAction).not.toHaveBeenCalled();
  });

  it("Escape cancels without calling the action (AC3)", async () => {
    const user = await open();
    await user.type(input(), EMAIL);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(deleteAccountAction).not.toHaveBeenCalled();
  });

  it("submits the typed email", async () => {
    deleteAccountAction.mockReturnValue(new Promise(() => {}));
    const user = await open();
    await user.type(input(), EMAIL);
    await user.click(confirmButton());
    expect(deleteAccountAction).toHaveBeenCalledWith(EMAIL);
    // In flight: spinner-only button, both controls disabled, cannot be dismissed.
    expect(screen.getByRole("button", { name: "Deleting your account…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("error keeps typed email and shows a focused alert", async () => {
    deleteAccountAction.mockResolvedValue({ ok: false, error: "failed" });
    const user = await open();
    await user.type(input(), EMAIL);
    await user.click(confirmButton());
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("We couldn't delete your account. Try again, or contact support if this keeps happening.");
    await waitFor(() => expect(alert).toHaveFocus());
    expect(input()).toHaveValue(EMAIL);
    expect(confirmButton()).toBeEnabled();
  });

  it("description links to /privacy#after-deletion in a new tab with the fingerprint note (D5)", async () => {
    await open();
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveAccessibleDescription(/We keep only a one-way hash of your email/);
    const link = screen.getByRole("link", { name: "Privacy policy" });
    expect(link).toHaveAttribute("href", "/privacy#after-deletion");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });
});
