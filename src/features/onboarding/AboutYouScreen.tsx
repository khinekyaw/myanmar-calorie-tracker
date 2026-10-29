import { router } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useOnboarding } from '@/store/onboarding';
import { makeStyles } from '@/theme/ThemeProvider';
import { NumberField, OptionCard } from '@/ui';

import { OnboardingLayout } from './OnboardingLayout';

const thisYear = new Date().getFullYear();
const inRange = (v: string, min: number, max: number) => v !== '' && +v >= min && +v <= max;

export function AboutYouScreen() {
  const { t } = useTranslation();
  const s = useStyles();
  const { sex, birthYear, heightFt, heightIn, weightLb, update } = useOnboarding();

  const valid =
    sex !== null &&
    inRange(birthYear, thisYear - 100, thisYear - 13) &&
    inRange(heightFt, 3, 7) &&
    inRange(heightIn || '0', 0, 11) &&
    inRange(weightLb, 60, 500);

  return (
    <OnboardingLayout
      step={1}
      title={t('aboutYou.title')}
      canContinue={valid}
      onContinue={() => router.push('/workday')}>
      <View style={s.sexRow} accessibilityRole="radiogroup" accessibilityLabel={t('aboutYou.sex')}>
        <OptionCard
          layout="center"
          label={t('aboutYou.male')}
          selected={sex === 'male'}
          onPress={() => update({ sex: 'male' })}
          style={s.sexOption}
        />
        <OptionCard
          layout="center"
          label={t('aboutYou.female')}
          selected={sex === 'female'}
          onPress={() => update({ sex: 'female' })}
          style={s.sexOption}
        />
      </View>
      <NumberField
        label={t('aboutYou.birthYear')}
        parts={[{ value: birthYear, onChange: (v) => update({ birthYear: v }), maxLength: 4 }]}
      />
      <NumberField
        label={t('aboutYou.height')}
        parts={[
          { value: heightFt, onChange: (v) => update({ heightFt: v }), maxLength: 1, suffix: '′', accessibilityLabel: t('aboutYou.feet') },
          { value: heightIn, onChange: (v) => update({ heightIn: v }), maxLength: 2, suffix: '″', accessibilityLabel: t('aboutYou.inches') },
        ]}
      />
      <NumberField
        label={t('aboutYou.weight')}
        parts={[
          { value: weightLb, onChange: (v) => update({ weightLb: v }), maxLength: 5, suffix: t('common.lb'), decimal: true },
        ]}
      />
    </OnboardingLayout>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  sexRow: { flexDirection: 'row', gap: theme.space.sm, marginBottom: theme.space.xs },
  sexOption: { flex: 1 },
}));
