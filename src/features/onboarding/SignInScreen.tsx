import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, TextInput, View, type TextInputInstance } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatNumber } from '@/lib/format';
import { useConnectivity } from '@/lib/network';
import { requestCode, signInWithGoogle, verifyCode, type CodeRequest } from '@/services/auth';
import { backendEnabled } from '@/services/supabase';
import { useOnboarding } from '@/store/onboarding';
import { scheduleSync } from '@/sync/engine';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Button, GoogleLogo, IconButton, Screen, Text } from '@/ui';

import { AFTER_SIGN_IN, isAfterSignIn } from './signInFirst';

const CODE_LENGTH = 6;
/** Matches the server's limit (`[auth.email] max_frequency` in supabase/config.toml). */
const RESEND_SECONDS = 30;

const normalizeEmail = (raw: string) => raw.trim().toLowerCase();
/** Loose check (something@domain.tld); the email that arrives is the real test. */
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

type Problem = 'errorSend' | 'errorCode' | 'errorGoogle' | 'offline';

/**
 * Email code first, or Google; skip allowed (the data still syncs under an
 * anonymous account). No phone/SMS in the first version (docs/DECISIONS.md →
 * "Email sign-in"); no Facebook (blocked without VPN). Opened from onboarding,
 * or from Settings (`?from=settings`) to sign in later.
 *
 * Without a backend (prototype builds) no email is sent, any 6-digit code
 * works and Google just continues (MOCK).
 */
export function SignInScreen() {
  const { t } = useTranslation();
  const s = useStyles();
  const { theme, type, language } = useStyleContext();
  const { from, then } = useLocalSearchParams<{ from?: string; then?: string }>();
  const { online } = useConnectivity();
  const complete = useOnboarding((st) => st.complete);
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [code, setCode] = useState('');
  /** Seconds until another code may be sent; counts down on the code step. */
  const [resendIn, setResendIn] = useState(0);
  /** The action waiting on the network; its button shows a spinner. */
  const [busy, setBusy] = useState<'send' | 'verify' | 'google' | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const request = useRef<CodeRequest | null>(null);
  const codeInput = useRef<TextInputInstance>(null);

  const address = normalizeEmail(email);
  const finish = () => {
    // Opened on the way to a screen that needs an account: go on to it.
    if (isAfterSignIn(then)) return router.replace(AFTER_SIGN_IN[then]);
    if (from === 'settings') return router.back();
    complete();
    router.dismissAll();
    router.replace('/home');
  };

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const back = () => {
    if (step === 'email') return router.back();
    setStep('email');
    setCode('');
    setProblem(null);
  };

  const sendCode = async () => {
    setProblem(null);
    setCode('');
    if (!backendEnabled) {
      setResendIn(RESEND_SECONDS);
      return setStep('code');
    }
    if (!online) return setProblem('offline');
    setBusy('send');
    try {
      request.current = await requestCode(address);
      setStep('code');
      setResendIn(RESEND_SECONDS);
    } catch {
      setProblem('errorSend');
    } finally {
      setBusy(null);
    }
  };

  const verify = async () => {
    if (!backendEnabled || !request.current) return finish();
    if (!online) return setProblem('offline');
    setBusy('verify');
    setProblem(null);
    try {
      await verifyCode(request.current, code);
      // Signing in to an existing account brings its meals and profile down.
      scheduleSync();
      finish();
    } catch {
      setProblem('errorCode');
      setCode('');
      codeInput.current?.focus();
    } finally {
      setBusy(null);
    }
  };

  const google = async () => {
    setProblem(null);
    if (!backendEnabled) return finish();
    if (!online) return setProblem('offline');
    setBusy('google');
    try {
      if ((await signInWithGoogle()) === 'signedIn') {
        scheduleSync();
        finish();
      }
    } catch {
      setProblem('errorGoogle');
    } finally {
      setBusy(null);
    }
  };

  return (
    <KeyboardAvoidingView style={s.fill} behavior="padding">
      <Screen>
        <View style={s.header}>
          <IconButton icon="chevronLeft" accessibilityLabel={t('common.back')} onPress={back} />
          {/* Skip only during onboarding; from Settings or a gift code, Back is the way out. */}
          {from !== 'settings' && (
            <Pressable accessibilityRole="button" onPress={finish} hitSlop={8} style={s.skip}>
              <Text variant="callout" tone="muted">
                {t('signIn.skip')}
              </Text>
            </Pressable>
          )}
        </View>

        <Text variant="title" accessibilityRole="header" style={s.title}>
          {step === 'email' ? t('signIn.title') : t('signIn.codeTitle')}
        </Text>
        {step === 'code' && (
          <Text variant="callout" tone="muted" numberOfLines={1} style={s.sentTo}>
            {address}
          </Text>
        )}

        {step === 'email' ? (
          <View style={s.field}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              autoComplete="email"
              textContentType="emailAddress"
              autoFocus
              maxLength={254}
              returnKeyType="send"
              onSubmitEditing={() => isValidEmail(address) && !busy && sendCode()}
              selectionColor={theme.colors.selection}
              cursorColor={theme.colors.cursor}
              selectionHandleColor={theme.colors.cursor}
              accessibilityLabel={t('signIn.title')}
              // Font only: a fixed lineHeight puts a one-line input's text at the top on iOS.
              style={[{ fontFamily: type.body.fontFamily }, s.input]}
            />
          </View>
        ) : (
          <Pressable style={s.code} onPress={() => codeInput.current?.focus()} accessible={false}>
            {Array.from({ length: CODE_LENGTH }, (_, i) => (
              <View key={i} style={[s.cell, i === code.length && s.cellActive]}>
                <Text variant="numberMd">{code[i] ?? ''}</Text>
              </View>
            ))}
            <TextInput
              ref={codeInput}
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, CODE_LENGTH))}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              autoFocus
              accessibilityLabel={t('signIn.codeTitle')}
              style={s.hiddenInput}
            />
          </Pressable>
        )}

        {problem && (
          <Text variant="callout" accessibilityLiveRegion="polite" style={s.problem}>
            {t(`signIn.${problem}`)}
          </Text>
        )}

        {/* Actions sit right under the field, above the keyboard; Google is the alternative below a divider. */}
        {step === 'email' ? (
          <View style={s.actions}>
            <Button
              label={t('signIn.sendCode')}
              loading={busy === 'send'}
              disabled={!isValidEmail(address) || !!busy}
              onPress={sendCode}
            />
            <View style={s.divider} accessible={false}>
              <View style={s.line} />
              <Text variant="caption" tone="muted">
                {t('signIn.or')}
              </Text>
              <View style={s.line} />
            </View>
            <Button
              variant="secondary"
              label={t('signIn.google')}
              leading={<GoogleLogo />}
              loading={busy === 'google'}
              disabled={!!busy}
              onPress={google}
            />
          </View>
        ) : (
          <View style={s.actions}>
            <Button
              label={t('signIn.verify')}
              loading={busy === 'verify'}
              disabled={code.length < CODE_LENGTH || !!busy}
              onPress={verify}
            />
            <Button
              variant="ghost"
              label={
                resendIn > 0 ? t('signIn.resendIn', { seconds: formatNumber(resendIn, language) }) : t('signIn.resend')
              }
              loading={busy === 'send'}
              disabled={!!busy || resendIn > 0}
              onPress={sendCode}
            />
          </View>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  fill: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: theme.space.md },
  skip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: theme.space.sm },
  title: { marginTop: theme.space.xxxl },
  field: {
    marginTop: theme.space.xxl,
    height: theme.size.field,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  sentTo: { marginTop: theme.space.sm },
  input: {
    flex: 1,
    fontSize: 17,
    height: '100%',
    paddingVertical: 0,
    paddingHorizontal: theme.space.lg,
    color: theme.colors.text,
  },
  code: { marginTop: theme.space.xxl, flexDirection: 'row', gap: theme.space.sm },
  cell: {
    flex: 1,
    height: 60,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellActive: { borderColor: theme.colors.selected },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  problem: { marginTop: theme.space.md },
  actions: { marginTop: theme.space.xl, gap: theme.space.md },
  divider: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md, paddingVertical: theme.space.xs },
  line: { flex: 1, height: 1, backgroundColor: theme.colors.surfaceStrong },
}));
