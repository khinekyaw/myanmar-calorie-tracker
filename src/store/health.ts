import type { HealthFlags } from '@/domain/health';

import { useOnboarding } from './onboarding';
import { useIsPremium } from './premium';

/**
 * Blood sugar / pressure guidance. The question is free (and the stricter
 * rice plan follows it for everyone); the guidance built on it is Premium.
 *
 * - `asked`: what the user answered.
 * - `on`: guidance to show (answered and Premium).
 * - `locked`: answered something but not Premium: show the upsell instead.
 */
export function useHealthGuidance() {
  const flags = useOnboarding((s) => s.healthFlags);
  const premium = useIsPremium();
  const asked: HealthFlags = { bloodSugar: flags.includes('bloodSugar'), bloodPressure: flags.includes('bloodPressure') };
  const on: HealthFlags = { bloodSugar: asked.bloodSugar && premium, bloodPressure: asked.bloodPressure && premium };
  return { asked, on, locked: !premium && (asked.bloodSugar || asked.bloodPressure) };
}
