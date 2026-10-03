import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithIntl } from "@/components/shell/test-utils";

import { ExtractionFailed } from "./extraction-failed";

describe("ExtractionFailed", () => {
  it("shows the filename stays attached, with Try again and Fill in manually (AC3)", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    await renderWithIntl(<ExtractionFailed fileName="scanned.pdf" onRetry={onRetry} manualHref="/onboarding/profile" />);
    expect(screen.getByRole("heading", { name: "We couldn't read this resume" })).toBeInTheDocument();
    expect(screen.getByText("scanned.pdf stays attached — you can try again or fill in by hand.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fill in manually" })).toHaveAttribute("href", "/onboarding/profile");
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("disables Try again while a retry is starting", async () => {
    await renderWithIntl(<ExtractionFailed fileName="a.pdf" onRetry={vi.fn()} manualHref="/x" retrying />);
    expect(screen.getByRole("button", { name: "Try again" })).toBeDisabled();
  });

  it("announces a failed retry", async () => {
    await renderWithIntl(<ExtractionFailed fileName="a.pdf" onRetry={vi.fn()} manualHref="/x" retryError />);
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't restart/);
  });

  it("renders in Russian", async () => {
    await renderWithIntl(<ExtractionFailed fileName="a.pdf" onRetry={vi.fn()} manualHref="/x" />, "ru");
    expect(screen.getByRole("heading", { name: "Не удалось прочитать это резюме" })).toBeInTheDocument();
  });
});
