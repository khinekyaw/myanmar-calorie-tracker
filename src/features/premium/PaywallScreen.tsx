import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { PASSES, PAYMENT_PROVIDERS, type PassId } from '@/config/pricing';
import { formatNumber } from '@/lib/format';
import { tap } from '@/lib/haptics';
import { usePremium } from '@/store/premium';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Badge, Button, Icon, IconButton, Logo, Screen, Text, type IconName } from '@/ui';

/** Only what Premium does today. Blood sugar & pressure goals (`paywall.healthGoals`) return once built. */
const FEATURES: { key: 'unlimitedScans' | 'weeklyReport'; icon: IconName }[] = [
  { key: 'unlimitedScans', icon: 'camera' },
  { key: 'weeklyReport', icon: 'chart' },
];

/** Prepaid passes paid with KBZPay / WavePay. Shown only after free scans run out. */
export function PaywallScreen() {
  const { t } = useTranslation();
  const s = useStyles();
  const { theme, language } = useStyleContext();
  const [pass, setPass] = useState<PassId>('3m');
  const activate = usePremium((st) => st.activate);
  const buy = () => {
    activate(PASSES.find((p) => p.id === pass)?.months ?? 1);
    router.back();
  };

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
              // MOCK: activates the pass without paying — see docs/DECISIONS.md → "Payments".
              <Button key={p} label={p} style={s.pay} onPress={buy} />
            ))}
          </View>
        </View>
      }>
      <View style={s.top}>
        <IconButton icon="close" accessibilityLabel={t('common.close')} onPress={() => router.back()} />
      </View>

      <View style={s.badge}>
        <Logo size={30} color={theme.colors.accent} />
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
                <Badge tone="accent" label={t('paywall.bestValue')} style={s.tag} />
              )}
              <Text variant="label" tone="muted">
                {t(p.months === 1 ? 'paywall.month1' : 'paywall.month3')}
              </Text>
              <Text variant="headline">
                {t('paywall.price', { price: formatNumber(p.priceKs, language) })}
              </Text>
              {p.months > 1 && (
                <Text variant="caption" tone="muted">
                  {t('paywall.perMonth', {
                    price: formatNumber(Math.round(p.priceKs / p.months / 100) * 100, language),
                  })}
                </Text>
              )}
              {/* Keyed so the gold fill mounts with the view (Android rounding). */}
              <View key={selected ? 'on' : 'off'} style={[s.radio, selected && s.radioOn]}>
                {selected && <Icon name="check" size={14} strokeWidth={3} color={theme.colors.onAccent} />}
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
    backgroundColor: theme.colors.accentSoft,
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
  // Premium exception to "selected = ink": light gold reads as a reward, not a warning.
  passSelected: { backgroundColor: theme.colors.accentSoft },
  tag: {
    position: 'absolute',
    top: -15,
    left: theme.space.lg,
    borderWidth: 2,
    borderColor: theme.colors.background,
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
  radioOn: { backgroundColor: theme.colors.accent },
  footer: { gap: theme.space.md },
  note: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.space.sm },
  payRow: { flexDirection: 'row', gap: theme.space.sm },
  pay: { flex: 1, paddingHorizontal: theme.space.md },
}));
