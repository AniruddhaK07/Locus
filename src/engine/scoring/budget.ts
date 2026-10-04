/**
 * Locus Engine — Budget Utility Function
 *
 * Implements the continuous, monotone budget utility function specified in §4.4:
 *
 * Let Rmin, Rmax from the user (Rmin defaults to 0.4 * Rmax if not given)
 * and Rt = Rmin + 0.75 * (Rmax - Rmin):
 * - Rmin <= R <= Rt       -> U = 1.0
 * - Rt < R <= Rmax       -> U = 1 - 0.3 * (R - Rt) / (Rmax - Rt) (falls linearly from 1 to 0.7)
 * - R > Rmax             -> U = 0.7 * exp(-4 * (R - Rmax) / Rmax)
 * - R < Rmin             -> U = 1 - 0.3 * (Rmin - R) / Rmin, floored at 0.7
 */

export function computeBudgetUtility(
  rent: number,
  budgetMax: number,
  budgetMin?: number
): number {
  if (budgetMax <= 0 || rent < 0) {
    return 0;
  }

  const Rmin = budgetMin !== undefined && budgetMin > 0 ? budgetMin : 0.4 * budgetMax;
  const Rmax = budgetMax;
  const Rt = Rmin + 0.75 * (Rmax - Rmin);

  if (rent >= Rmin && rent <= Rt) {
    return 1.0;
  }

  if (rent > Rt && rent <= Rmax) {
    return 1.0 - 0.3 * ((rent - Rt) / (Rmax - Rt));
  }

  if (rent > Rmax) {
    return 0.7 * Math.exp(-4 * ((rent - Rmax) / Rmax));
  }

  // rent < Rmin
  const under = 1.0 - 0.3 * ((Rmin - rent) / Rmin);
  return Math.max(0.7, under);
}
