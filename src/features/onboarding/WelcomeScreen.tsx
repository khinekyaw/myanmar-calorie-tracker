import { Image } from 'expo-image';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { LANGUAGE_SHORT, LANGUAGES } from '@/i18n/languages';
import { useSettings } from '@/store/settings';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Button, Logo, Screen, Segmented, Text } from '@/ui';

/** Hero: the full "scanning a mohinga" image, shown uncropped (768 × 1376). */
const HERO = require('@/assets/images/welcome-mohinga.jpg');
const HERO_RATIO = 768 / 1376;

export function WelcomeScreen() {
  const { t } = useTranslation();
  const s = useStyles();
  const { language } = useStyleContext();
  const setLanguage = useSettings((st) => st.setLanguage);

  return (
    <Screen
      footer={
        <View style={s.actions}>
          <Button label={t('welcome.start')} onPress={() => router.push('/about-you')} />
          <Button variant="ghost" label={t('welcome.signIn')} onPress={() => router.push('/sign-in')} />
        </View>
      }>
      <View style={s.topBar}>
        <View style={s.brand}>
          <Logo size={26} />
          <Text variant="wordmark">Sar AI</Text>
        </View>
        <Segmented
          tone="light"
          accessibilityLabel={t('language.change')}
          value={language}
          onChange={setLanguage}
          options={LANGUAGES.map((l) => ({ value: l, label: LANGUAGE_SHORT[l] }))}
        />
      </View>

      {/* The image keeps its own proportions and shrinks to the space left, so nothing is cut off. */}
      <View style={s.hero}>
        <Image source={HERO} style={s.photo} contentFit="contain" transition={250} accessible={false} />
      </View>

      <Text variant="display" align="center" accessibilityRole="header" style={s.title}>
        {t('welcome.title')}
      </Text>
    </Screen>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.space.md,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  hero: { flex: 1, minHeight: 260, marginTop: theme.space.lg, alignItems: 'center' },
  photo: { height: '100%', aspectRatio: HERO_RATIO, maxWidth: '100%', borderRadius: theme.radius.xxl },
  title: { marginTop: theme.space.xl },
  actions: { gap: theme.space.xs },
}));
