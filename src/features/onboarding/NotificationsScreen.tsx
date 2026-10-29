import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useSettings } from '@/store/settings';
import { makeStyles } from '@/theme/ThemeProvider';
import { Text } from '@/ui';

import { OnboardingLayout } from './OnboardingLayout';

/** Reminder opt-in, previewing the "ထမင်းစားပြီးပြီလား?" notification. */
export function NotificationsScreen() {
  const { t } = useTranslation();
  const s = useStyles();
  const setReminders = useSettings((st) => st.setReminders);

  const next = () => router.push('/generating');

  const allow = async () => {
    const { granted } = await Notifications.requestPermissionsAsync().catch(() => ({ granted: false }));
    setReminders(granted);
    next();
  };

  return (
    <OnboardingLayout
      step={6}
      onContinue={allow}
      continueLabel={t('notify.allow')}
      secondary={{
        label: t('notify.later'),
        onPress: () => {
          setReminders(false);
          next();
        },
      }}>
      <View style={s.preview} accessible accessibilityLabel={t('notify.sample')}>
        <View style={s.appIcon}>
          <Text variant="numberSm" tone="inverse">
            S
          </Text>
        </View>
        <Text variant="bodyStrong" style={s.message}>
          {t('notify.sample')}
        </Text>
        <Text variant="caption" tone="muted">
          12:30
        </Text>
      </View>
      <Text variant="title" align="center" accessibilityRole="header" style={s.title}>
        {t('notify.title')}
      </Text>
    </OnboardingLayout>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    paddingVertical: theme.space.md + 2,
    paddingHorizontal: theme.space.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background,
    ...theme.shadow.chip,
  },
  appIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: { flex: 1 },
  title: { marginTop: theme.space.xxxl },
}));
