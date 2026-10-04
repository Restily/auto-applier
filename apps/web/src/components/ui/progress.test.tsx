import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"

import { Progress } from "./progress"

describe("Progress", () => {
  it("exposes the value to assistive tech (aria-valuenow)", () => {
    render(<Progress value={40} aria-label="Upload" />)
    const bar = screen.getByRole("progressbar", { name: "Upload" })
    expect(bar).toHaveAttribute("aria-valuenow", "40")
    expect(bar).toHaveAttribute("aria-valuemax", "100")
  })

  it("moves the indicator with the value", () => {
    const { container } = render(<Progress value={25} aria-label="Upload" />)
    const indicator = container.querySelector("[data-slot=progress-indicator]") as HTMLElement
    expect(indicator.style.transform).toBe("translateX(-75%)")
  })

  it("without a value it is indeterminate: no aria-valuenow", () => {
    render(<Progress aria-label="Working" />)
    expect(screen.getByRole("progressbar", { name: "Working" })).not.toHaveAttribute("aria-valuenow")
  })
})
