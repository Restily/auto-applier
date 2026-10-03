import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { adminClient, anonClient, createTestUser, deleteTestUser, type TestUser } from "../helpers/supabase";

const created: string[] = [];
async function newUser(): Promise<TestUser> {
  const u = await createTestUser();
  created.push(u.id);
  return u;
}
async function rows(userId: string) {
  const { data, error } = await adminClient()
    .from("credit_ledger")
    .select("delta, reason")
    .eq("user_id", userId);
  expect(error).toBeNull();
  return data ?? [];
}

let a: TestUser;
let b: TestUser;
beforeAll(async () => {
  a = await newUser();
  b = await newUser();
});
afterAll(async () => {
  await Promise.all(created.map(deleteTestUser));
});

describe("credit ledger (M1)", () => {
  it("new user sees exactly one signup_grant of 20", async () => {
    const { data, error } = await a.client.from("credit_ledger").select("delta, reason");
    expect(error).toBeNull();
    expect(data).toEqual([{ delta: 20, reason: "signup_grant" }]);
  });

  it("balance view returns 20", async () => {
    const { data, error } = await a.client.from("credit_balances").select("user_id, balance");
    expect(error).toBeNull();
    expect(data).toEqual([{ user_id: a.id, balance: 20 }]);
  });

  it("signing in again (new session) adds no rows", async () => {
    const again = anonClient();
    const res = await again.auth.signInWithPassword({ email: a.email, password: a.password });
    expect(res.error).toBeNull();
    expect(await rows(a.id)).toHaveLength(1);
  });

  it("user cannot insert, update or delete ledger rows", async () => {
    const ins = await a.client
      .from("credit_ledger")
      .insert({ user_id: a.id, delta: 1000, reason: "operator_adjustment", ref_type: "t", ref_id: randomUUID() });
    expect(ins.error).not.toBeNull();
    const upd = await a.client.from("credit_ledger").update({ delta: 1000 }).eq("user_id", a.id);
    expect(upd.error).not.toBeNull();
    const del = await a.client.from("credit_ledger").delete().eq("user_id", a.id);
    expect(del.error).not.toBeNull();
    expect(await rows(a.id)).toEqual([{ delta: 20, reason: "signup_grant" }]);
  });

  it("user cannot read another user's rows", async () => {
    const { data, error } = await b.client.from("credit_ledger").select("*").eq("user_id", a.id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
    const bal = await b.client.from("credit_balances").select("*").eq("user_id", a.id);
    expect(bal.data ?? []).toEqual([]);
  });

  it("anon reads nothing", async () => {
    const anon = anonClient();
    for (const table of ["credit_ledger", "credit_balances"]) {
      const { data } = await anon.from(table).select("*");
      expect(data ?? [], table).toEqual([]);
    }
  });

  it("re-sign-up after deletion has no signup_grant and balance 0", async () => {
    const admin = adminClient();
    const local = `qa+${randomUUID()}`;
    const first = await admin.auth.admin.createUser({ email: `${local}@example.test`, password: `Pw-${randomUUID()}`, email_confirm: true });
    expect(first.error).toBeNull();
    const firstId = first.data.user!.id;
    expect(await rows(firstId)).toHaveLength(1);
    await deleteTestUser(firstId);

    const password = `Pw-${randomUUID()}`;
    const second = await admin.auth.admin.createUser({
      email: `${local.toUpperCase()}@EXAMPLE.TEST`,
      password,
      email_confirm: true,
    });
    expect(second.error).toBeNull();
    const secondId = second.data.user!.id;
    created.push(secondId);
    expect(await rows(secondId)).toEqual([]);

    const client = anonClient();
    const signIn = await client.auth.signInWithPassword({ email: second.data.user!.email!, password });
    expect(signIn.error).toBeNull();
    const bal = await client.from("credit_balances").select("balance").eq("user_id", secondId);
    expect(bal.error).toBeNull();
    expect(bal.data).toEqual([]);
  });

  it("fingerprint table is unreachable through the Data API", async () => {
    for (const [name, client] of [
      ["anon", anonClient()],
      ["user", a.client],
      ["secret key", adminClient()],
    ] as const) {
      const { data, error } = await client.schema("private" as never).from("deleted_account_fingerprints").select();
      expect(error, name).not.toBeNull();
      expect(data, name).toBeNull();
    }
  });
});
