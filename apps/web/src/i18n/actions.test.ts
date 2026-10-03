import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieSet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: cookieSet }),
}));

const getSessionUser = vi.fn();
vi.mock("@/lib/auth/session", () => ({ getSessionUser: () => getSessionUser() }));

const eq = vi.fn();
const update = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ update }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ from }),
}));

import { setLocale } from "@/i18n/actions";

describe("setLocale", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUser.mockResolvedValue(null);
    eq.mockResolvedValue({ error: null });
  });

  it("rejects an unsupported locale", async () => {
    await expect(setLocale("de" as never)).rejects.toThrow();
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("sets the cookie for signed-out visitors", async () => {
    await expect(setLocale("ru")).resolves.toEqual({ persisted: true });
    expect(cookieSet).toHaveBeenCalledWith(
      "NEXT_LOCALE",
      "ru",
      expect.objectContaining({ path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 }),
    );
    expect(from).not.toHaveBeenCalled();
  });

  it("persists to profiles for signed-in users", async () => {
    getSessionUser.mockResolvedValue({ id: "u1", email: "a@b.test" });
    await expect(setLocale("ru")).resolves.toEqual({ persisted: true });
    expect(from).toHaveBeenCalledWith("profiles");
    expect(update).toHaveBeenCalledWith({ ui_locale: "ru" });
    expect(eq).toHaveBeenCalledWith("id", "u1");
    expect(cookieSet).toHaveBeenCalled();
  });

  it("returns persisted false and keeps the cookie when the update fails", async () => {
    getSessionUser.mockResolvedValue({ id: "u1", email: "a@b.test" });
    eq.mockResolvedValue({ error: { message: "boom" } });
    await expect(setLocale("en")).resolves.toEqual({ persisted: false });
    expect(cookieSet).toHaveBeenCalledWith("NEXT_LOCALE", "en", expect.any(Object));
  });
});
