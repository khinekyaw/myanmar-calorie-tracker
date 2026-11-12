/**
 * Blood sugar and blood pressure guidance (Premium): every threshold in one
 * place. ALL PLACEHOLDERS until the nutritionist reviews them, like the dish
 * numbers they apply to (drafts from catalogue/, never verified yet).
 * See docs/LAUNCH_CHECKLIST.md → "How the Premium features will work".
 */
export const HEALTH_LIMITS = {
  // ── Blood sugar ──
  /**
   * PLACEHOLDER: a meal with this much sugar (g, total sugars as eaten) is
   * "sugar-heavy". 18 g flags a ချိုစိမ့် tea (≈20 g) but not a ပေါ့စိမ့် one (≈16 g).
   */
  sugarHeavyMealG: 18,
  /** PLACEHOLDER: sugar-heavy meals a week to aim under (the Home card's ring). */
  sugarHeavyMealsPerWeek: 3,
  /** PLACEHOLDER: at most this share of the day's kcal from carbs (normal plan: whatever's left, ~50 %). */
  bloodSugarCarbShare: 0.4,

  // ── Blood pressure ──
  /** PLACEHOLDER: daily sodium budget in mg (WHO: under 2,000 mg). */
  sodiumBudgetMg: 2000,
  /** PLACEHOLDER: a meal with this much sodium (mg) is "salty": about a third of the daily budget. */
  saltyMealMg: 700,
} as const;
