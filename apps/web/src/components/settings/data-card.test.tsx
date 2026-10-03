import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const downloadExport = vi.fn();
const { toastSuccess, toastError } = vi.hoisted(() => ({ toastSuccess: vi.fn(), toastError: vi.fn() }));
vi.mock("@/lib/account/export-client", () => ({ downloadExport: (...a: unknown[]) => downloadExport(...a) }));
vi.mock("sonner", () => ({ toast: { success: toastSuccess, error: toastError } }));

import { renderWithIntl } from "@/components/shell/test-utils";

import { DataCard } from "./data-card";

beforeEach(() => vi.clearAllMocks());

describe("DataCard", () => {
  it("shows preparing state then success toast", async () => {
    let resolve!: (v: "started") => void;
    downloadExport.mockReturnValue(new Promise((r) => (resolve = r)));
    const user = userEvent.setup();
    await renderWithIntl(<DataCard />);
    await user.click(screen.getByRole("button", { name: "Download my data" }));
    const busy = screen.getByRole("button", { name: "Preparing your data…" });
    expect(busy).toBeDisabled();
    resolve("started");
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Your export is downloading"));
    expect(screen.getByRole("button", { name: "Download my data" })).toBeEnabled();
  });

  it("error toast on failure", async () => {
    downloadExport.mockResolvedValue("error");
    const user = userEvent.setup();
    await renderWithIntl(<DataCard />);
    await user.click(screen.getByRole("button", { name: "Download my data" }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("We couldn't prepare your export. Try again."));
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Download my data" })).toBeEnabled();
  });
});
