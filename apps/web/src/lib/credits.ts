export type CreditsView = { count: number; tone: "normal" | "low" | "empty" };

export const LOW_CREDITS_THRESHOLD = 5;

export function creditsView(balance: number | null): CreditsView {
  const count = balance ?? 0;
  if (count <= 0) return { count: 0, tone: "empty" };
  if (count < LOW_CREDITS_THRESHOLD) return { count, tone: "low" };
  return { count, tone: "normal" };
}
