import { describe, expect, it } from "vitest";

import { emailsMatch } from "./confirm";

describe("emailsMatch", () => {
  it("exact", () => expect(emailsMatch("a@example.test", "a@example.test")).toBe(true));
  it("trimmed", () => expect(emailsMatch("  a@example.test \n", "a@example.test")).toBe(true));
  it("case-insensitive", () => expect(emailsMatch("A@Example.TEST", "a@example.test")).toBe(true));
  it("different -> false", () => expect(emailsMatch("b@example.test", "a@example.test")).toBe(false));
  it("empty never matches", () => expect(emailsMatch("", "")).toBe(false));
});
