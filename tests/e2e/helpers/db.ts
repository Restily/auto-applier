import { adminClient } from "../../integration/helpers/supabase";

export async function ledgerRows(userId: string): Promise<Array<{ delta: number; reason: string }>> {
  const { data, error } = await adminClient()
    .from("credit_ledger")
    .select("delta, reason")
    .eq("user_id", userId)
    .order("id");
  if (error) throw new Error(`ledgerRows: ${error.message}`);
  return data ?? [];
}
