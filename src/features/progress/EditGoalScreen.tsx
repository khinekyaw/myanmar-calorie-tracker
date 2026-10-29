import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { buildPlan, PACES, type Goal, type Pace } from '@/domain/plan';
import { formatPlates } from '@/lib/format';
import { draftToPlanInput, useOnboarding } from '@/store/onboarding';
import { refreshPlan } from '@/store/plan';
import { useLatest } from '@/store/weights';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Button, IconButton, MeasureInput, OptionCard, Screen, Segmented, Text } from '@/ui';

import { ReachByLine } from '../onboarding/ReachByLine';

const GOALS: Goal[] = ['lose', 'maintain', 'gain'];

/** Change goal, target weight and pace after onboarding (Settings → Goals, Progress → Edit goal). */
export function EditGoalScreen() {
  const { t } = useTranslation();
  const s = useStyles();
  const { language } = useStyleContext();
  const profile = useOnboarding();
  const current = useLatest('weight')?.value ?? (Number(profile.weightLb) || 140);

  const [goal, setGoal] = useState<Goal>(profile.goal ?? 'lose');
  const [target, setTarget] = useState(profile.targetWeightLb ?? Math.round(current - 10));
  const [pace, setPace] = useState<Pace>(profile.pace);

  const pickGoal = (g: Goal) => {
    setGoal(g);
    if (g === 'lose' && target >= current) setTarget(Math.round(current - 10));
    if (g === 'gain' && target <= current) setTarget(Math.round(current + 10));
  };

  const input = draftToPlanInput({ ...profile, goal, pace, weightLb: String(current) });
  const date = input && goal !== 'maintain' ? buildPlan({ ...input, targetWeightLb: target }).targetDate : null;

  const save = () => {
    profile.update({ goal, pace, targetWeightLb: goal === 'maintain' ? current : target });
    refreshPlan();
    router.back();
  };

  return (
    <Screen footer={<Button label={t('common.save')} onPress={save} />}>
      <View style={s.header}>
        <IconButton icon="chevronLeft" accessibilityLabel={t('common.back')} onPress={() => router.back()} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <Text variant="title" accessibilityRole="header">
          {t('goal.title')}
        </Text>
        <View style={s.options} accessibilityRole="radiogroup">
          {GOALS.map((g) => (
            <OptionCard key={g} label={t(`goal.${g}`)} selected={goal === g} onPress={() => pickGoal(g)} />
          ))}
        </View>

        {goal !== 'maintain' && (
          <View style={s.target}>
            <Text variant="label" tone="muted" align="center">
              {t('target.title')}
            </Text>
            <MeasureInput
              key={goal}
              value={target}
              min={goal === 'gain' ? Math.ceil(current) : 70}
              max={goal === 'gain' ? 400 : Math.floor(current)}
              unit={t('common.lb')}
              scale="lb"
              onChange={setTarget}
              accessibilityLabel={t('target.title')}
            />
            <Text variant="label" tone="muted" align="center">
              {t('target.perWeek')}
            </Text>
            <Segmented
              tone="light"
              size="lg"
              accessibilityLabel={t('target.perWeek')}
              value={String(pace)}
              onChange={(v) => setPace(Number(v) as Pace)}
              options={PACES.map((p) => ({ value: String(p), label: formatPlates(p, language) }))}
            />
            <ReachByLine date={date} />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  header: { flexDirection: 'row', paddingTop: theme.space.md },
  scroll: { gap: theme.space.xxl, paddingTop: theme.space.xxl, paddingBottom: theme.space.xxl },
  options: { gap: theme.space.sm },
  target: { gap: theme.space.lg, alignItems: 'stretch' },
}));
