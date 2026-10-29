import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, TextInput, View, type TextInputInstance } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useConnectivity } from '@/lib/network';
import { requestCode, verifyCode, type CodeRequest } from '@/services/auth';
import { backendEnabled } from '@/services/supabase';
import { useOnboarding } from '@/store/onboarding';
import { scheduleSync } from '@/sync/engine';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Button, IconButton, Screen, Text } from '@/ui';

const CODE_LENGTH = 6;

/** Myanmar mobile numbers: 9 + 7–9 digits after +95 (a leading 0 is dropped). */
const normalizePhone = (raw: string) => raw.replace(/\D/g, '').replace(/^0/, '');
const isValidPhone = (digits: string) => /^9\d{7,9}$/.test(digits);

type Problem = 'errorSend' | 'errorCode' | 'offline';

/**
 * Phone OTP first, skip allowed (the data still syncs under an anonymous
 * account). No Facebook (blocked without VPN). Opened from onboarding, or
 * from Settings (`?from=settings`) to sign in later.
 *
 * Without a backend (prototype builds) no SMS is sent and any 6-digit code
 * works; Google is shown only there (MOCK) until the OAuth client exists.
 */
export function SignInScreen() {
  const { t } = useTranslation();
  const s = useStyles();
  const { theme, type } = useStyleContext();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { online } = useConnectivity();
  const complete = useOnboarding((st) => st.complete);
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const request = useRef<CodeRequest | null>(null);
  const codeInput = useRef<TextInputInstance>(null);

  const digits = normalizePhone(phone);
  const finish = () => {
    if (from === 'settings') return router.back();
    complete();
    router.dismissAll();
    router.replace('/home');
  };

  const back = () => {
    if (step === 'phone') return router.back();
    setStep('phone');
    setCode('');
    setProblem(null);
  };

  const sendCode = async () => {
    setProblem(null);
    setCode('');
    if (!backendEnabled) return setStep('code');
    if (!online) return setProblem('offline');
    setBusy(true);
    try {
      request.current = await requestCode(`+95${digits}`);
      setStep('code');
    } catch {
      setProblem('errorSend');
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!backendEnabled || !request.current) return finish();
    if (!online) return setProblem('offline');
    setBusy(true);
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
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.fill} behavior="padding">
      <Screen
        footer={
          step === 'phone' ? (
            <View style={s.footer}>
              <Button label={t('signIn.sendCode')} disabled={!isValidPhone(digits) || busy} onPress={sendCode} />
              {!backendEnabled && <Button variant="secondary" label={t('signIn.google')} onPress={finish} />}
            </View>
          ) : (
            <View style={s.footer}>
              <Button label={t('signIn.verify')} disabled={code.length < CODE_LENGTH || busy} onPress={verify} />
              <Button variant="ghost" label={t('signIn.resend')} disabled={busy} onPress={sendCode} />
            </View>
          )
        }>
        <View style={s.header}>
          <IconButton icon="chevronLeft" accessibilityLabel={t('common.back')} onPress={back} />
          <Pressable accessibilityRole="button" onPress={finish} hitSlop={8} style={s.skip}>
            <Text variant="callout" tone="muted">
              {t('signIn.skip')}
            </Text>
          </Pressable>
        </View>

        <Text variant="title" accessibilityRole="header" style={s.title}>
          {step === 'phone' ? t('signIn.title') : t('signIn.codeTitle')}
        </Text>

        {step === 'phone' ? (
          <View style={s.field}>
            <Text variant="numberMd" style={s.prefix}>
              +95
            </Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              autoFocus
              maxLength={13}
              placeholder="9 xxx xxx xxx"
              placeholderTextColor={theme.colors.iconMuted}
              selectionColor={theme.colors.selection}
              cursorColor={theme.colors.cursor}
              selectionHandleColor={theme.colors.cursor}
              accessibilityLabel={t('signIn.title')}
              style={[type.numberMd, s.input]}
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
              autoComplete="sms-otp"
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
  prefix: { fontSize: 17, paddingHorizontal: theme.space.lg },
  input: { flex: 1, fontSize: 17, height: '100%', paddingVertical: 0, color: theme.colors.text },
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
  footer: { gap: theme.space.sm },
}));
