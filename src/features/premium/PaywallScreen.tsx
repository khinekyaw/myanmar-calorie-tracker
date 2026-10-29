import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { PASSES, PAYMENT_PROVIDERS, type PassId } from '@/config/pricing';
import { tap } from '@/lib/haptics';
import { makeStyles } from '@/theme/ThemeProvider';
import { Button, Icon, IconButton, Screen, Text, type IconName } from '@/ui';

const FEATURES: { key: 'unlimitedScans' | 'healthGoals' | 'weeklyReport'; icon: IconName }[] = [
  { key: 'unlimitedScans', icon: 'camera' },
  { key: 'healthGoals', icon: 'drop' },
  { key: 'weeklyReport', icon: 'chart' },
];

/** Prepaid passes paid with KBZPay / WavePay. Shown only after free scans run out. */
export function PaywallScreen() {
  const { t } = useTranslation();
  const s = useStyles();
  const [pass, setPass] = useState<PassId>('3m');

  return (
    <Screen
      footer={
        <View style={s.footer}>
          <View style={s.note}>
            <Icon name="shield" size={16} strokeWidth={2} />
            <Text variant="label" tone="muted">
              {t('paywall.noAutoRenew')}
            </Text>
          </View>
          <View style={s.payRow}>
            {PAYMENT_PROVIDERS.map((p) => (
              // Payment flow not built yet — see docs/DECISIONS.md → "Payments".
              <Button key={p} label={p} style={s.pay} onPress={() => router.back()} />
            ))}
          </View>
        </View>
      }>
      <View style={s.top}>
        <IconButton icon="close" accessibilityLabel={t('common.close')} onPress={() => router.back()} />
      </View>

      <View style={s.badge}>
        <Icon name="sparkle" size={28} strokeWidth={1.8} />
      </View>
      <Text variant="display" accessibilityRole="header" style={s.title}>
        {t('paywall.title')}
      </Text>

      <View style={s.features}>
        {FEATURES.map((f) => (
          <View key={f.key} style={s.feature}>
            <View style={s.featureIcon}>
              <Icon name={f.icon} size={20} />
            </View>
            <Text variant="body" style={s.featureText}>
              {t(`paywall.${f.key}`)}
            </Text>
          </View>
        ))}
      </View>

      <View style={s.passes} accessibilityRole="radiogroup">
        {PASSES.map((p) => {
          const selected = pass === p.id;
          return (
            <Pressable
              key={p.id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => {
                tap();
                setPass(p.id);
              }}
              style={[s.pass, selected && s.passSelected]}>
              {'bestValue' in p && p.bestValue && (
                <View style={s.tag}>
                  <Text variant="caption" tone="inverse">
                    {t('paywall.bestValue')}
                  </Text>
                </View>
              )}
              <Text variant="label" tone={selected ? 'inverse' : 'muted'}>
                {t(p.months === 1 ? 'paywall.month1' : 'paywall.month3')}
              </Text>
              <Text variant="headline" tone={selected ? 'inverse' : 'default'}>
                {t('paywall.price', { price: p.priceKs })}
              </Text>
              <View style={s.radio}>
                {selected && <Icon name="check" size={14} strokeWidth={3} />}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  top: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: theme.space.md },
  badge: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.space.xs,
  },
  title: { marginTop: theme.space.lg },
  features: { marginTop: theme.space.xxl, gap: theme.space.lg },
  feature: { flexDirection: 'row', alignItems: 'center', gap: theme.space.lg },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1 },
  passes: { flexDirection: 'row', gap: theme.space.md, marginTop: theme.space.xxxl },
  pass: {
    flex: 1,
    padding: theme.space.lg + 2,
    paddingTop: theme.space.xl,
    gap: theme.space.xs,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
  },
  passSelected: { backgroundColor: theme.colors.selected },
  tag: {
    position: 'absolute',
    top: -12,
    left: theme.space.lg,
    paddingHorizontal: theme.space.sm + 2,
    borderRadius: theme.radius.pill,
    borderWidth: 2,
    borderColor: theme.colors.background,
    backgroundColor: theme.colors.selected,
  },
  radio: {
    position: 'absolute',
    top: theme.space.lg,
    right: theme.space.lg,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { gap: theme.space.md },
  note: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.space.sm },
  payRow: { flexDirection: 'row', gap: theme.space.sm },
  pay: { flex: 1, paddingHorizontal: theme.space.md },
}));
