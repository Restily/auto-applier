/**
 * Server-side log of the underlying database error before a query helper throws its generic error.
 * Only the code and message are logged: `details`/`hint` can echo row values (PII).
 */
export function logDbError(scope: string, error: { code?: string | undefined; message?: string | undefined }): void {
  console.error(`[db] ${scope}: code=${error.code ?? "unknown"} message=${error.message ?? "unknown"}`);
}
