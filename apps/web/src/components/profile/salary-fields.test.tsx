import { screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";

import { renderWithIntl, stubBrowserApis } from "@/components/shell/test-utils";

import { SalaryFields } from "./salary-fields";

beforeAll(stubBrowserApis);

const value = { salaryMin: null, salaryMax: null, salaryCurrency: null, salaryPeriod: null };

function render(props: { minError?: "maxValue" | "salaryRange"; error?: "maxValue" | "salaryRange" }) {
  return renderWithIntl(<SalaryFields id="max" minId="min" value={value} onChange={() => undefined} {...props} />);
}

/** Text of the elements an input's aria-describedby points at. */
function described(el: HTMLElement): string[] {
  return (el.getAttribute("aria-describedby") ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? "");
}

describe("SalaryFields errors (M1 review N2)", () => {
  it("both invalid: each input is invalid and describes its own message", async () => {
    await render({ minError: "maxValue", error: "salaryRange" });
    const min = screen.getByLabelText(/^Min/);
    const max = screen.getByLabelText(/^Max/);
    expect(min).toHaveAttribute("aria-invalid", "true");
    expect(max).toHaveAttribute("aria-invalid", "true");
    expect(described(min)).toEqual(["This number is too large"]);
    expect(described(max)).toEqual(["Max should be greater than min"]);
    expect(min.getAttribute("aria-describedby")).not.toBe(max.getAttribute("aria-describedby"));
    expect(screen.getAllByRole("alert")).toHaveLength(2);
  });

  it("only Min invalid: Max stays clean", async () => {
    await render({ minError: "maxValue" });
    const max = screen.getByLabelText(/^Max/);
    expect(max).not.toHaveAttribute("aria-invalid");
    expect(max).not.toHaveAttribute("aria-describedby");
    expect(described(screen.getByLabelText(/^Min/))).toEqual(["This number is too large"]);
  });

  it("only Max invalid: Min stays clean", async () => {
    await render({ error: "salaryRange" });
    const min = screen.getByLabelText(/^Min/);
    expect(min).not.toHaveAttribute("aria-invalid");
    expect(min).not.toHaveAttribute("aria-describedby");
    expect(described(screen.getByLabelText(/^Max/))).toEqual(["Max should be greater than min"]);
  });

  it("no errors: no alerts and no describedby", async () => {
    await render({});
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^Min/)).not.toHaveAttribute("aria-describedby");
  });
});
