import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const captured: Record<string, unknown>[] = [];
vi.mock("sonner", () => ({
  Toaster: (props: Record<string, unknown>) => {
    captured.push(props);
    return null;
  },
}));
vi.mock("next-themes", () => ({ useTheme: () => ({ theme: "light" }) }));

import { Toaster } from "./sonner";

describe("Toaster placement (B-004)", () => {
  it("is top-center so it never covers the sticky Save bar or bottom-pinned actions", () => {
    render(<Toaster />);
    const props = captured.at(-1)!;
    expect(props.position).toBe("top-center");
    expect(String(props.position)).not.toMatch(/bottom/);
  });

  it("clears the shell header via the offset", () => {
    render(<Toaster />);
    expect(String(captured.at(-1)!.offset)).toContain("--shell-header-height");
  });
});
