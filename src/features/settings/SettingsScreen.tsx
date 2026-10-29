import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { LANGUAGE_SHORT, LANGUAGES } from '@/i18n/languages';
import { useOnboarding } from '@/store/onboarding';
import { useScanQuota } from '@/store/scanQuota';
import { useSettings } from '@/store/settings';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Icon, ListRow, Segmented, Text } from '@/ui';

export function SettingsScreen() {
  const { t } = useTranslation();
  const s = useStyles();
  const { theme, language } = useStyleContext();
  const settings = useSettings();
  const resetOnboarding = useOnboarding((st) => st.reset);
  const resetScans = useScanQuota((st) => st.reset);

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text variant="title" accessibilityRole="header" style={s.title}>
          {t('settings.title')}
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/paywall')}
          style={({ pressed }) => [s.premium, pressed && s.pressed]}>
          <View style={s.premiumIcon}>
            <Icon name="sparkle" size={20} color={theme.colors.onPrimary} />
          </View>
          <Text variant="bodyStrong" tone="inverse" style={s.flex}>
            {t('settings.premium')}
          </Text>
          <Icon name="chevronRight" size={20} color={theme.colors.onPrimary} />
        </Pressable>

        <Section title={t('settings.sectionGoals')}>
          <ListRow kind="link" label={t('settings.goals')} onPress={() => {}} />
          <ListRow kind="link" label={t('settings.health')} onPress={() => {}} last />
        </Section>

        <Section title={t('settings.sectionDaily')}>
          <ListRow
            kind="switch"
            label={t('settings.uposatha')}
            value={settings.uposathaVegetarian}
            onValueChange={() => settings.toggle('uposathaVegetarian')}
          />
          <ListRow
            kind="switch"
            label={t('settings.feastDay')}
            value={settings.feastDay}
            onValueChange={() => settings.toggle('feastDay')}
          />
          <ListRow
            kind="switch"
            label={t('settings.reminders')}
            value={settings.reminders}
            onValueChange={() => settings.toggle('reminders')}
            last
          />
        </Section>

        <Section title={t('settings.sectionApp')}>
          <ListRow
            kind="switch"
            label={t('settings.wifiOnly')}
            value={settings.wifiOnlyUploads}
            onValueChange={() => settings.toggle('wifiOnlyUploads')}
          />
          <ListRow
            kind="custom"
            label={t('settings.language')}
            last
            right={
              <Segmented
                accessibilityLabel={t('settings.language')}
                tone="light"
                value={language}
                onChange={settings.setLanguage}
                options={LANGUAGES.map((l) => ({ value: l, label: LANGUAGE_SHORT[l] }))}
              />
            }
          />
        </Section>

        {__DEV__ && (
          <Section title="Developer">
            <ListRow
              kind="switch"
              label="Simulate offline"
              value={settings.devSimulateOffline}
              onValueChange={() => settings.toggle('devSimulateOffline')}
            />
            <ListRow kind="link" label="Reset free scans" onPress={resetScans} />
            <ListRow
              kind="link"
              label="Restart onboarding"
              last
              onPress={() => {
                resetOnboarding();
                router.replace('/welcome');
              }}
            />
          </Section>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const s = useStyles();
  return (
    <View style={s.section}>
      <Text variant="caption" tone="subtle" accessibilityRole="header">
        {title}
      </Text>
      <View>{children}</View>
    </View>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  root: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: theme.gutter, paddingBottom: theme.size.fab + theme.space.xxl },
  title: { marginTop: theme.space.lg },
  flex: { flex: 1 },
  pressed: { opacity: theme.opacity.pressed },
  premium: {
    marginTop: theme.space.lg,
    minHeight: 64,
    paddingHorizontal: theme.space.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
  },
  premiumIcon: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.onInkSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { marginTop: theme.space.xxl, gap: theme.space.xs },
}));
