import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { makeStyles } from '@/theme/ThemeProvider';
import { Button, IconButton, ProgressBar, Screen, Text } from '@/ui';

/** Number of onboarding steps after Welcome (AboutYou … SignIn). */
export const ONBOARDING_STEPS = 9;

type Props = {
  step: number;
  title: string;
  children: ReactNode;
  canContinue: boolean;
  onContinue: () => void;
};

/** Shared frame for question screens: back + progress, one headline, content, sticky Continue. */
export function OnboardingLayout({ step, title, children, canContinue, onContinue }: Props) {
  const { t } = useTranslation();
  const s = useStyles();
  return (
    <KeyboardAvoidingView style={s.fill} behavior="padding">
      <Screen
        footer={<Button label={t('common.continue')} disabled={!canContinue} onPress={onContinue} />}>
        <View style={s.header}>
          <IconButton icon="chevronLeft" accessibilityLabel={t('common.back')} onPress={() => router.back()} />
          <ProgressBar value={step / ONBOARDING_STEPS} />
        </View>
        <Text variant="title" accessibilityRole="header" style={s.title}>
          {title}
        </Text>
        <View style={s.body}>{children}</View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  fill: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.space.lg, paddingTop: theme.space.md },
  title: { marginTop: theme.space.xxxl },
  body: { flex: 1, justifyContent: 'center', gap: theme.space.md, paddingVertical: theme.space.xxl },
}));
