import { Image } from 'expo-image';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { LANGUAGE_SHORT, LANGUAGES } from '@/i18n/languages';
import { formatNumber } from '@/lib/format';
import { dishes } from '@/mocks/dishes';
import { photos } from '@/mocks/photos';
import { useOnboarding } from '@/store/onboarding';
import { useSettings } from '@/store/settings';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Button, ScanFrame, Screen, Segmented, Text } from '@/ui';

export function WelcomeScreen() {
  const { t } = useTranslation();
  const s = useStyles();
  const { theme, language } = useStyleContext();
  const setLanguage = useSettings((st) => st.setLanguage);
  const complete = useOnboarding((st) => st.complete);
  const sample = dishes.mohinga;

  return (
    <Screen
      footer={
        <View style={s.actions}>
          <Button label={t('welcome.start')} onPress={() => router.push('/about-you')} />
          <Button
            variant="ghost"
            label={t('welcome.signIn')}
            onPress={() => {
              // Sign-in screen is not built yet; go straight to the app.
              complete();
              router.replace('/home');
            }}
          />
        </View>
      }>
      <View style={s.topBar}>
        <Segmented
          tone="light"
          accessibilityLabel={t('language.change')}
          value={language}
          onChange={setLanguage}
          options={LANGUAGES.map((l) => ({ value: l, label: LANGUAGE_SHORT[l] }))}
        />
      </View>

      <View style={s.hero}>
        <Image source={photos.mohingaLarge} style={s.photo} contentFit="cover" transition={250} />
        <ScanFrame color={theme.colors.textInverse} inset={28} />
        <View style={s.chip}>
          <Text variant="callout">{sample.name[language]}</Text>
          <View style={s.dots}>
            <View style={[s.dot, { backgroundColor: theme.colors.nutrient.carbs }]} />
            <View style={[s.dot, { backgroundColor: theme.colors.nutrient.protein }]} />
            <View style={[s.dot, { backgroundColor: theme.colors.nutrient.fat }]} />
          </View>
          <Text variant="numberSm" style={s.kcal}>
            {formatNumber(sample.kcal, language)}
          </Text>
        </View>
      </View>

      <Text variant="display" align="center" accessibilityRole="header" style={s.title}>
        {t('welcome.title')}
      </Text>
    </Screen>
  );
}

const useStyles = makeStyles(({ theme, type }) => ({
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: theme.space.md },
  hero: {
    flex: 1,
    minHeight: 260,
    marginTop: theme.space.lg,
    borderRadius: theme.radius.xxl,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
  },
  photo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  chip: {
    position: 'absolute',
    bottom: theme.space.xxl,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    paddingVertical: theme.space.sm,
    paddingHorizontal: theme.space.lg,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.background,
    ...theme.shadow.chip,
  },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  kcal: { ...type.numberSm, fontSize: 17 },
  title: { marginTop: theme.space.xxl },
  actions: { gap: theme.space.xs },
}));
