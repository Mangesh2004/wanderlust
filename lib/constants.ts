// Shared constants — safe to import in both client and server code

export const BUDGET_RANGES: Record<string, { min: number; max: number | null; label: string }> = {
  budget: { min: 30, max: 80, label: "$30–80/day" },
  moderate: { min: 80, max: 200, label: "$80–200/day" },
  luxury: { min: 200, max: null, label: "$200+/day" },
};

export function getBudgetRangeString(budget: string): string {
  const range = BUDGET_RANGES[budget];
  if (!range) return "$80–200/day";
  return range.max ? `$${range.min}–${range.max} USD per person per day` : `$${range.min}+ USD per person per day`;
}
