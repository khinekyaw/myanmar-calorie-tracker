import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';

import { tap } from '@/lib/haptics';
import { useOnboarding, type EatingPlace } from '@/store/onboarding';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';
import { Icon, Text } from '@/ui';

import { OnboardingLayout } from './OnboardingLayout';

const PLACES: EatingPlace[] = ['homeShared', 'riceShop', 'teaShop', 'street', 'delivery'];

/** Multi-select: where the user usually eats (tunes defaults like shared-meal mode). */
export function EatingHabitsScreen() {
  const { t } = useTranslation();
  const s = useStyles();
  const theme = useTheme();
  const places = useOnboarding((st) => st.eatingPlaces);
  const update = useOnboarding((st) => st.update);

  const toggle = (p: EatingPlace) => {
    tap();
    update({ eatingPlaces: places.includes(p) ? places.filter((x) => x !== p) : [...places, p] });
  };

  return (
    <OnboardingLayout
      step={5}
      title={t('eating.title')}
      canContinue={places.length > 0}
      onContinue={() => router.push('/notifications')}>
      {PLACES.map((p) => {
        const on = places.includes(p);
        return (
          <Pressable
            key={p}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            onPress={() => toggle(p)}
            style={({ pressed }) => [s.option, on ? s.on : s.off, pressed && !on && s.pressed]}>
            <Text variant={on ? 'bodyStrong' : 'body'} tone={on ? 'inverse' : 'default'} style={s.label}>
              {t(`eating.${p}`)}
            </Text>
            {on && <Icon name="check" size={18} strokeWidth={2.6} color={theme.colors.onSelected} />}
          </Pressable>
        );
      })}
    </OnboardingLayout>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  option: {
    minHeight: 60,
    paddingHorizontal: theme.space.xl,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
  },
  on: { backgroundColor: theme.colors.selected },
  off: { backgroundColor: theme.colors.surface },
  pressed: { backgroundColor: theme.colors.surfaceStrong },
  label: { flex: 1 },
}));
