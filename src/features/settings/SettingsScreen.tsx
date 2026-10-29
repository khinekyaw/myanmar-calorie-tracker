import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { LANGUAGE_SHORT, LANGUAGES } from '@/i18n/languages';
import { formatDayLabel } from '@/lib/format';
import { useOnboarding } from '@/store/onboarding';
import { pendingSyncCount } from '@/db/database';
import { useAccount } from '@/services/auth';
import { backendEnabled } from '@/services/supabase';
import { useIsPremium, usePremium, usePremiumUntil } from '@/store/premium';
import { useScanQuota } from '@/store/scanQuota';
import { useSettings } from '@/store/settings';
import { deleteAccountAndData } from '@/sync/account';
import { syncNow } from '@/sync/engine';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { ConfirmSheet, Icon, ListRow, Segmented, Text } from '@/ui';

/** "959123456789" → "+95 9123456789" */
const formatPhone = (e164: string) => `+${e164.slice(0, 2)} ${e164.slice(2)}`;

export function SettingsScreen() {
  const { t } = useTranslation();
  const s = useStyles();
  const { theme, language } = useStyleContext();
  const settings = useSettings();
  const resetOnboarding = useOnboarding((st) => st.reset);
  const goal = useOnboarding((st) => st.goal);
  const resetScans = useScanQuota((st) => st.reset);
  const isPremium = useIsPremium();
  const premiumUntil = usePremiumUntil();
  const activatePremium = usePremium((st) => st.activate);
  const cancelPremium = usePremium((st) => st.cancel);
  const phone = useAccount((st) => st.phone);
  const [deleting, setDeleting] = useState<'confirm' | 'failed' | null>(null);
  const [busy, setBusy] = useState(false);

  const removeAccount = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await deleteAccountAndData();
      setDeleting(null);
      router.replace('/welcome');
    } catch {
      setDeleting('failed');
    } finally {
      setBusy(false);
    }
  };

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
            <Icon name="sparkle" size={20} color={theme.colors.accent} />
          </View>
          <View style={s.flex}>
            <Text variant="bodyStrong" tone="inverse">
              {t('settings.premium')}
            </Text>
            {premiumUntil && (
              <Text variant="caption" tone="inverse" style={s.premiumUntil}>
                {t('settings.premiumUntil', { date: formatDayLabel(new Date(premiumUntil), language) })}
              </Text>
            )}
          </View>
          <Icon name="chevronRight" size={20} color={theme.colors.onPrimary} />
        </Pressable>

        <Section title={t('settings.sectionGoals')}>
          {backendEnabled &&
            (phone ? (
              <ListRow
                kind="custom"
                label={t('settings.phone')}
                right={
                  <Text variant="callout" tone="muted">
                    {formatPhone(phone)}
                  </Text>
                }
              />
            ) : (
              <ListRow
                kind="link"
                label={t('settings.phone')}
                value={t('settings.signIn')}
                onPress={() => router.push({ pathname: '/sign-in', params: { from: 'settings' } })}
              />
            ))}
          <ListRow
            kind="link"
            label={t('settings.goals')}
            value={goal ? t(`goal.${goal}`) : undefined}
            onPress={() => router.push('/edit-goal')}
          />
          <ListRow kind="link" label={t('settings.health')} onPress={() => router.push('/health')} last />
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
            last={!backendEnabled}
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
          {backendEnabled && (
            <ListRow kind="link" label={t('settings.deleteAccount')} onPress={() => setDeleting('confirm')} last />
          )}
        </Section>

        {__DEV__ && (
          <Section title="Developer">
            <ListRow
              kind="switch"
              label="Simulate offline"
              value={settings.devSimulateOffline}
              onValueChange={() => settings.toggle('devSimulateOffline')}
            />
            <ListRow
              kind="switch"
              label="Premium (mock)"
              value={isPremium}
              onValueChange={(on) => (on ? activatePremium(1) : cancelPremium())}
            />
            <ListRow kind="link" label="Reset free scans" onPress={resetScans} />
            <ListRow
              kind="custom"
              label="Changes waiting to sync"
              right={<Text variant="numberSm">{pendingSyncCount()}</Text>}
            />
            {backendEnabled && <ListRow kind="link" label="Sync now" onPress={() => void syncNow()} />}
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

      <ConfirmSheet
        visible={deleting !== null}
        title={deleting === 'failed' ? t('settings.deleteFailed') : t('settings.deleteTitle')}
        confirmLabel={deleting === 'failed' ? t('common.retry') : t('settings.deleteConfirm')}
        cancelLabel={t('common.cancel')}
        onConfirm={removeAccount}
        onCancel={() => setDeleting(null)}
      />
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
  premiumUntil: { opacity: 0.7 },
  section: { marginTop: theme.space.xxl, gap: theme.space.xs },
}));
