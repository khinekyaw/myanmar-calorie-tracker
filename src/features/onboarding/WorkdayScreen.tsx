import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import type { Workday } from '@/domain/nutrition';
import { useOnboarding } from '@/store/onboarding';
import { OptionCard, type IconName } from '@/ui';

import { OnboardingLayout } from './OnboardingLayout';

const OPTIONS: { value: Workday; icon: IconName }[] = [
  { value: 'office', icon: 'briefcase' },
  { value: 'shop', icon: 'store' },
  { value: 'physical', icon: 'box' },
  { value: 'home', icon: 'home' },
];

export function WorkdayScreen() {
  const { t } = useTranslation();
  const workday = useOnboarding((s) => s.workday);
  const update = useOnboarding((s) => s.update);
  const complete = useOnboarding((s) => s.complete);

  return (
    <OnboardingLayout
      step={2}
      title={t('workday.title')}
      canContinue={workday !== null}
      onContinue={() => {
        // Goal → … → SignIn come next in the full flow; not built yet.
        complete();
        router.replace('/home');
      }}>
      {OPTIONS.map((o) => (
        <OptionCard
          key={o.value}
          icon={o.icon}
          label={t(`workday.${o.value}`)}
          selected={workday === o.value}
          onPress={() => update({ workday: o.value })}
        />
      ))}
    </OnboardingLayout>
  );
}
