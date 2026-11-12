import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatGiftCode, isGiftCodeShape } from '@/domain/giftCode';
import { formatDayLabel } from '@/lib/format';
import { tap } from '@/lib/haptics';
import { useConnectivity } from '@/lib/network';
import { openSignedIn } from '@/features/onboarding/signInFirst';
import { useAccount } from '@/services/auth';
import { backendEnabled } from '@/services/supabase';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Button, Icon, IconButton, Logo, Screen, Text } from '@/ui';

import { redeemGiftCode, type RedeemResult } from './redeem';

type Problem = Exclude<RedeemResult, 'ok' | 'sign_in_required'> | 'offline' | 'error';

const PROBLEM = {
  invalid: 'redeem.invalid',
  expired: 'redeem.expired',
  used_up: 'redeem.usedUp',
  already_used: 'redeem.alreadyUsed',
  rate_limited: 'redeem.rateLimited',
  offline: 'signIn.offline',
  error: 'redeem.error',
} as const satisfies Record<Problem, string>;

/**
 * Gift code → Premium (docs/LAUNCH_CHECKLIST.md → "Gift codes"). Opened from
 * the paywall. A pass on an anonymous account would be lost when the phone
 * switches to an existing account, so with a backend the user signs in first
 * (email or Google), going through Sign in on the way here
 * (`features/onboarding/signInFirst.ts`). It needs the internet: a code isn't queued offline.
 */
export function RedeemScreen() {
  const { t } = useTranslation();
  const s = useStyles();
  const { theme, type, language } = useStyleContext();
  const { online } = useConnectivity();
  const signedIn = useAccount((st) => Boolean(st.email));
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  /** Set once redeemed: the pass's end date. */
  const [done, setDone] = useState<{ endsAt: string | null } | null>(null);

  // Opened while signed out (e.g. a link): Sign in first, which comes back here.
  const mustSignIn = backendEnabled && !signedIn;
  useEffect(() => {
    if (mustSignIn) openSignedIn('redeem', { replace: true });
  }, [mustSignIn]);

  const redeem = async () => {
    if (busy || !isGiftCodeShape(code)) return;
    if (backendEnabled && !online) return setProblem('offline');
    setBusy(true);
    setProblem(null);
    try {
      const { result, endsAt: until } = await redeemGiftCode(code);
      if (result === 'ok') {
        tap();
        setDone({ endsAt: until });
      } else if (result === 'sign_in_required') {
        openSignedIn('redeem', { replace: true, force: true });
      } else {
        setProblem(result);
      }
    } catch {
      setProblem('error');
    } finally {
      setBusy(false);
    }
  };

  if (mustSignIn) return null;

  if (done) {
    return (
      <Screen footer={<Button label={t('redeem.done')} onPress={() => router.back()} />}>
        <View style={s.center} accessibilityLiveRegion="polite">
          <View style={s.badge}>
            <Logo size={30} color={theme.colors.accent} />
          </View>
          <Text variant="title" accessibilityRole="header" align="center">
            {t('redeem.doneTitle')}
          </Text>
          {done.endsAt && (
            <Text variant="body" tone="muted" align="center">
              {t('settings.premiumUntil', { date: formatDayLabel(new Date(done.endsAt), language) })}
            </Text>
          )}
        </View>
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView style={s.fill} behavior="padding">
      <Screen>
        <View style={s.header}>
          <IconButton icon="chevronLeft" accessibilityLabel={t('common.back')} onPress={() => router.back()} />
        </View>

        <Text variant="title" accessibilityRole="header" style={s.title}>
          {t('redeem.title')}
        </Text>
        <View style={s.field}>
          <Icon name="sparkle" size={20} color={theme.colors.iconMuted} />
          <TextInput
            value={code}
            onChangeText={(v) => {
              setCode(formatGiftCode(v));
              setProblem(null);
            }}
            // Latin letters even when the phone's keyboard is Burmese (Android).
            keyboardType={Platform.OS === 'android' ? 'visible-password' : 'ascii-capable'}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            spellCheck={false}
            autoFocus
            maxLength={29}
            returnKeyType="done"
            // Keep the keyboard up: after a wrong code the next step is fixing it.
            submitBehavior="submit"
            onSubmitEditing={redeem}
            selectionColor={theme.colors.selection}
            cursorColor={theme.colors.cursor}
            selectionHandleColor={theme.colors.cursor}
            accessibilityLabel={t('redeem.title')}
            style={[type.numberMd, s.input]}
          />
        </View>
        {problem && (
          <Text variant="callout" accessibilityLiveRegion="polite" style={s.problem}>
            {t(PROBLEM[problem])}
          </Text>
        )}
        <View style={s.actions}>
          <Button label={t('redeem.redeem')} disabled={!isGiftCodeShape(code) || busy} onPress={redeem} />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  fill: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: theme.space.md },
  title: { marginTop: theme.space.xxxl },
  field: {
    marginTop: theme.space.xxl,
    height: theme.size.field,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    paddingLeft: theme.space.lg,
    overflow: 'hidden',
  },
  input: { flex: 1, fontSize: 17, height: '100%', paddingVertical: 0, letterSpacing: 1, color: theme.colors.text },
  problem: { marginTop: theme.space.md },
  actions: { marginTop: theme.space.xl, gap: theme.space.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.space.lg },
  badge: {
    width: 64,
    height: 64,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
