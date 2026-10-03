import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { localEnv } from "../helpers/local-env";
import { adminClient, anonClient, createTestUser, deleteTestUser, type TestUser } from "../helpers/supabase";

const BUCKET = "resumes";
let a: TestUser;
let b: TestUser;
let path: string;

beforeAll(async () => {
  a = await createTestUser();
  b = await createTestUser();
  path = `${a.id}/${randomUUID()}.pdf`;
  const up = await adminClient()
    .storage.from(BUCKET)
    .upload(path, Buffer.from("%PDF-1.4\n%qa\n"), { contentType: "application/pdf" });
  expect(up.error).toBeNull();
});
afterAll(async () => {
  await adminClient().storage.from(BUCKET).remove([path]);
  await Promise.all([a, b].map((u) => deleteTestUser(u.id)));
});

describe("resumes bucket (M1, ADR-0014: secret key only)", () => {
  it("owner download denied", async () => {
    const { data, error } = await a.client.storage.from(BUCKET).download(path);
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it("other user download denied", async () => {
    const { data, error } = await b.client.storage.from(BUCKET).download(path);
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it("anon download denied", async () => {
    const { data, error } = await anonClient().storage.from(BUCKET).download(path);
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it("list under the owner's folder returns nothing or an error for the user", async () => {
    const { data, error } = await a.client.storage.from(BUCKET).list(a.id);
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });

  it("user upload into own folder denied", async () => {
    const { data, error } = await a.client.storage
      .from(BUCKET)
      .upload(`${a.id}/${randomUUID()}.pdf`, Buffer.from("%PDF-1.4\n"), { contentType: "application/pdf" });
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it("public URL does not serve the object", async () => {
    const { data } = anonClient().storage.from(BUCKET).getPublicUrl(path);
    const res = await fetch(data.publicUrl);
    expect(res.status).not.toBe(200);
    expect(localEnv().supabaseUrl).toBeTruthy();
  });
});
