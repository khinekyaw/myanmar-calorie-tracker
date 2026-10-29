import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { Sex } from '@/domain/nutrition';
import { useOnboarding, type HealthFlag } from '@/store/onboarding';
import { refreshPlan } from '@/store/plan';
import { makeStyles } from '@/theme/ThemeProvider';
import { Button, IconButton, ListRow, NumberField, OptionCard, Screen, Text } from '@/ui';

const FLAGS: HealthFlag[] = ['bloodSugar', 'bloodPressure'];

/** Health conditions to track and the body details the plan and BMI use. */
export function HealthScreen() {
  const { t } = useTranslation();
  const s = useStyles();
  const profile = useOnboarding();
  const [flags, setFlags] = useState(profile.healthFlags);
  const [sex, setSex] = useState<Sex | null>(profile.sex);
  const [birthYear, setBirthYear] = useState(profile.birthYear);
  const [heightFt, setHeightFt] = useState(profile.heightFt);
  const [heightIn, setHeightIn] = useState(profile.heightIn);

  const save = () => {
    profile.update({ healthFlags: flags, sex, birthYear, heightFt, heightIn });
    refreshPlan();
    router.back();
  };

  return (
    <KeyboardAvoidingView style={s.fill} behavior="padding">
      <Screen footer={<Button label={t('common.save')} onPress={save} />}>
        <View style={s.header}>
          <IconButton icon="chevronLeft" accessibilityLabel={t('common.back')} onPress={() => router.back()} />
        </View>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.scroll}>
          <Text variant="title" accessibilityRole="header">
            {t('settings.health')}
          </Text>

          <View>
            {FLAGS.map((f, i) => (
              <ListRow
                key={f}
                kind="switch"
                label={t(`goal.${f}`)}
                value={flags.includes(f)}
                onValueChange={(on) => setFlags(on ? [...flags, f] : flags.filter((x) => x !== f))}
                last={i === FLAGS.length - 1}
              />
            ))}
          </View>

          <View style={s.body}>
            <Text variant="caption" tone="subtle" accessibilityRole="header">
              {t('health.body')}
            </Text>
            <View style={s.sexRow} accessibilityRole="radiogroup" accessibilityLabel={t('aboutYou.sex')}>
              {(['male', 'female'] as Sex[]).map((x) => (
                <OptionCard key={x} layout="center" label={t(`aboutYou.${x}`)} selected={sex === x} onPress={() => setSex(x)} style={s.flex} />
              ))}
            </View>
            <NumberField label={t('aboutYou.birthYear')} parts={[{ value: birthYear, onChange: setBirthYear, maxLength: 4 }]} />
            <NumberField
              label={t('aboutYou.height')}
              parts={[
                { value: heightFt, onChange: setHeightFt, maxLength: 1, suffix: '′', accessibilityLabel: t('aboutYou.feet') },
                { value: heightIn, onChange: setHeightIn, maxLength: 2, suffix: '″', accessibilityLabel: t('aboutYou.inches') },
              ]}
            />
          </View>
        </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  fill: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  header: { flexDirection: 'row', paddingTop: theme.space.md },
  scroll: { gap: theme.space.xxl, paddingTop: theme.space.xxl, paddingBottom: theme.space.xxl },
  body: { gap: theme.space.md },
  sexRow: { flexDirection: 'row', gap: theme.space.sm },
}));
