import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { makeStyles } from '@/theme/ThemeProvider';
import { Button, IconButton, ProgressBar, Screen, Text } from '@/ui';

/** Question steps with a progress bar: AboutYou, Workday, Goal, Target, Eating, Notifications. */
export const ONBOARDING_STEPS = 6;

type Props = {
  step: number;
  /** Omit when the screen places its own headline (Notifications). */
  title?: string;
  children: ReactNode;
  canContinue?: boolean;
  onContinue: () => void;
  continueLabel?: string;
  /** Optional ghost button under the main one ("Not now"). */
  secondary?: { label: string; onPress: () => void };
  /** 'center' (default) centres the answers vertically; 'top' keeps them under the title. */
  align?: 'center' | 'top';
};

/** Shared frame for question screens: back + progress, one headline, content, sticky Continue. */
export function OnboardingLayout({
  step,
  title,
  children,
  canContinue = true,
  onContinue,
  continueLabel,
  secondary,
  align = 'center',
}: Props) {
  const { t } = useTranslation();
  const s = useStyles();
  return (
    <KeyboardAvoidingView style={s.fill} behavior="padding">
      <Screen
        footer={
          <View style={s.footer}>
            <Button label={continueLabel ?? t('common.continue')} disabled={!canContinue} onPress={onContinue} />
            {secondary && <Button variant="ghost" label={secondary.label} onPress={secondary.onPress} />}
          </View>
        }>
        <View style={s.header}>
          <IconButton icon="chevronLeft" accessibilityLabel={t('common.back')} onPress={() => router.back()} />
          <ProgressBar value={step / ONBOARDING_STEPS} />
        </View>
        {title && (
          <Text variant="title" accessibilityRole="header" style={s.title}>
            {title}
          </Text>
        )}
        <View style={[s.body, align === 'top' && s.bodyTop]}>{children}</View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  fill: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.space.lg, paddingTop: theme.space.md },
  title: { marginTop: theme.space.xxxl },
  body: { flex: 1, justifyContent: 'center', gap: theme.space.md, paddingVertical: theme.space.xxl },
  bodyTop: { justifyContent: 'flex-start' },
  footer: { gap: theme.space.xs },
}));
