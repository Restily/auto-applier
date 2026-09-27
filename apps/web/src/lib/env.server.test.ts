// @vitest-environment node
import { describe, expect, it } from "vitest";

import { parseServerEnv } from "./env.server";

describe("parseServerEnv", () => {
  it("defaults API_URL", () => {
    const env = parseServerEnv({});

    expect(env.API_URL).toBe("http://127.0.0.1:8000");
  });

  it("accepts a valid API_URL", () => {
    const env = parseServerEnv({ API_URL: "http://127.0.0.1:9001" });

    expect(env.API_URL).toBe("http://127.0.0.1:9001");
  });

  it("rejects an invalid API_URL naming the variable", () => {
    expect(() => parseServerEnv({ API_URL: "not-a-url" })).toThrowError(/API_URL/);
  });
});
