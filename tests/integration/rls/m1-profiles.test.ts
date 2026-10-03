import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { adminClient, createTestUser, deleteTestUser, type TestUser } from "../helpers/supabase";

const created: string[] = [];
let a: TestUser;
let b: TestUser;

beforeAll(async () => {
  a = await createTestUser();
  b = await createTestUser();
  created.push(a.id, b.id);
});
afterAll(async () => {
  await Promise.all(created.map(deleteTestUser));
});

const answers = {
  work_authorization: "sponsorship",
  relocation: "open",
  notice_period: "1_month",
  salary_min: 3000,
  salary_max: 5000,
  salary_currency: "EUR",
  salary_period: "month",
} as const;

describe("candidate_profiles RLS (M1)", () => {
  it("user upserts and reads own candidate_profiles incl. application answers", async () => {
    const up = await a.client
      .from("candidate_profiles")
      .upsert({ user_id: a.id, full_name: "Ada Test", contact_email: a.email, target_titles: ["Engineer"], skills: ["ts"], years_experience: "3_5", ...answers });
    expect(up.error).toBeNull();
    const up2 = await a.client.from("candidate_profiles").upsert({ user_id: a.id, full_name: "Ada Test 2", ...answers });
    expect(up2.error).toBeNull();
    const { data, error } = await a.client.from("candidate_profiles").select("*").eq("user_id", a.id).single();
    expect(error).toBeNull();
    expect(data).toMatchObject({ full_name: "Ada Test 2", ...answers });
    expect(data.version).toBeGreaterThanOrEqual(2);
  });

  it("user cannot write another user's profile", async () => {
    const ins = await b.client.from("candidate_profiles").insert({ user_id: a.id, full_name: "Mallory" });
    expect(ins.error).not.toBeNull();
    const upd = await b.client.from("candidate_profiles").update({ full_name: "Mallory" }).eq("user_id", a.id).select();
    expect(upd.data ?? []).toEqual([]);
    const { data } = await adminClient().from("candidate_profiles").select("full_name").eq("user_id", a.id).single();
    expect(data?.full_name).toBe("Ada Test 2");
  });

  it("user cannot read another user's profile", async () => {
    const { data, error } = await b.client.from("candidate_profiles").select("*").eq("user_id", a.id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("user can update own ui_locale only", async () => {
    const ok = await a.client.from("profiles").update({ ui_locale: "ru" }).eq("id", a.id).select("ui_locale");
    expect(ok.error).toBeNull();
    expect(ok.data).toEqual([{ ui_locale: "ru" }]);
    const bad = await a.client.from("profiles").update({ created_at: "2000-01-01T00:00:00Z" }).eq("id", a.id);
    expect(bad.error).not.toBeNull();
    const other = await b.client.from("profiles").update({ ui_locale: "ru" }).eq("id", a.id).select();
    expect(other.data ?? []).toEqual([]);
    const invalid = await a.client.from("profiles").update({ ui_locale: "fr" }).eq("id", a.id);
    expect(invalid.error).not.toBeNull();
  });

  it("resumes are select-own and read-only for users", async () => {
    const admin = adminClient();
    const id = randomUUID();
    const ins = await admin.from("resumes").insert({
      id,
      user_id: a.id,
      storage_path: `${a.id}/${id}.pdf`,
      file_name: "cv.pdf",
      mime_type: "application/pdf",
      size_bytes: 10,
    });
    expect(ins.error).toBeNull();

    const own = await a.client.from("resumes").select("id").eq("id", id);
    expect(own.data).toEqual([{ id }]);
    const foreign = await b.client.from("resumes").select("id").eq("id", id);
    expect(foreign.data).toEqual([]);

    const bid = randomUUID();
    const w = await a.client.from("resumes").insert({
      id: bid, user_id: a.id, storage_path: `${a.id}/${bid}.pdf`, file_name: "x.pdf",
      mime_type: "application/pdf", size_bytes: 1, is_current: false,
    });
    expect(w.error).not.toBeNull();
    expect((await a.client.from("resumes").update({ file_name: "y.pdf" }).eq("id", id)).error).not.toBeNull();
    expect((await a.client.from("resumes").delete().eq("id", id)).error).not.toBeNull();
    const still = await admin.from("resumes").select("file_name").eq("id", id).single();
    expect(still.data?.file_name).toBe("cv.pdf");
  });
});
