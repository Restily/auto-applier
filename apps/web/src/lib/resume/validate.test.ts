import { describe, expect, it } from "vitest";

import { RESUME_MAX_BYTES, validateResumeFile } from "./validate";

describe("validateResumeFile", () => {
  it("accepts a pdf", () => {
    expect(validateResumeFile({ name: "cv.pdf", size: 1000 })).toBeNull();
  });
  it("accepts an upper-case DOCX", () => {
    expect(validateResumeFile({ name: "CV.DOCX", size: 1000 })).toBeNull();
  });
  it("rejects .doc as unsupported", () => {
    expect(validateResumeFile({ name: "cv.doc", size: 1000 })).toBe("resume.unsupported_type");
  });
  it("rejects .png as unsupported", () => {
    expect(validateResumeFile({ name: "photo.png", size: 1000 })).toBe("resume.unsupported_type");
  });
  it("rejects a name without an extension", () => {
    expect(validateResumeFile({ name: "resume", size: 1000 })).toBe("resume.unsupported_type");
  });
  it("accepts exactly 5 242 880 bytes", () => {
    expect(RESUME_MAX_BYTES).toBe(5_242_880);
    expect(validateResumeFile({ name: "cv.pdf", size: 5_242_880 })).toBeNull();
  });
  it("rejects one byte more as too_large", () => {
    expect(validateResumeFile({ name: "cv.pdf", size: 5_242_881 })).toBe("resume.too_large");
  });
  it("rejects 0 bytes as empty", () => {
    expect(validateResumeFile({ name: "cv.pdf", size: 0 })).toBe("resume.empty");
  });
  it("checks the type before the size", () => {
    expect(validateResumeFile({ name: "big.png", size: 9_999_999 })).toBe("resume.unsupported_type");
  });
});
