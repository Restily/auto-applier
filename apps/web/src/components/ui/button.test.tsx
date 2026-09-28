import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"

import { Button } from "./button"

describe("Button", () => {
  it("default size is 44px high (h-11)", () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole("button", { name: "Click me" })
    expect(button.className).toContain("h-11")
    expect(button).toHaveAttribute("data-size", "default")
  })

  it("icon size is 44x44 (size-11)", () => {
    render(<Button size="icon" aria-label="Icon action" />)
    const button = screen.getByRole("button", { name: "Icon action" })
    expect(button.className).toContain("size-11")
    expect(button).toHaveAttribute("data-size", "icon")
  })

  it("lg is 48px high (h-12)", () => {
    render(<Button size="lg">Big button</Button>)
    const button = screen.getByRole("button", { name: "Big button" })
    expect(button.className).toContain("h-12")
    expect(button).toHaveAttribute("data-size", "lg")
  })

  it("data-size reflects the size prop", () => {
    render(<Button size="sm">Small</Button>)
    const button = screen.getByRole("button", { name: "Small" })
    expect(button).toHaveAttribute("data-size", "sm")
  })
})
