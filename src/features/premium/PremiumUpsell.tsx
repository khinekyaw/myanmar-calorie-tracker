import { router } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Button, Logo, Text } from '@/ui';

/** Light-gold row: what Premium adds here, and a button to the paywall. */
export function PremiumUpsell({ title }: { title: string }) {
  const { t } = useTranslation();
  const s = useStyles();
  const { theme } = useStyleContext();
  return (
    <View style={s.row}>
      <View style={s.logo}>
        <Logo size={24} color={theme.colors.accent} />
      </View>
      <Text variant="bodyStrong" style={s.flex}>
        {title}
      </Text>
      <Button size="sm" label={t('report.premiumButton')} onPress={() => router.push('/paywall')} />
    </View>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  flex: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    padding: theme.space.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.accentSoft,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
