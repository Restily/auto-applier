import type { Tables } from "@/lib/supabase/database.types";

import type { ResumeState } from "./status";

export function toResumeState(row: Pick<Tables<"resumes">, "id" | "file_name" | "status" | "error_code" | "extracted">): ResumeState {
  const status = row.status === "ready" || row.status === "failed" ? row.status : "processing";
  const errorCode = row.error_code === "unreadable" || row.error_code === "ai_failed" ? row.error_code : null;
  return { id: row.id, fileName: row.file_name, status, errorCode, extracted: row.extracted };
}
