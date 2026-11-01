import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { BadgeStatus } from '@/domain/badges';
import { formatDayLabel, formatNumber } from '@/lib/format';
import { fromDayKey } from '@/store/weights';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { BottomSheet, Button, ProgressBar, Text } from '@/ui';

import { BadgeArt, PERCENT } from './BadgeArt';

type Props = { badge: BadgeStatus | null; onClose: () => void };

/** One badge up close: what it takes, and when it was earned or how far along it is. */
export function BadgeSheet({ badge, onClose }: Props) {
  const { t } = useTranslation();
  const s = useStyles();
  const { language } = useStyleContext();
  // Keep showing the last badge while the sheet slides out.
  const [shown, setShown] = useState(badge);
  if (badge && badge !== shown) setShown(badge);

  const percent = shown ? PERCENT.has(shown.id) : false;
  const fmt = (n: number) => `${formatNumber(n, language)}${percent ? '%' : ''}`;

  return (
    <BottomSheet visible={badge !== null} onClose={onClose} closeLabel={t('common.close')} contentStyle={s.content}>
      {shown && (
        <>
          <View style={s.art}>
            <BadgeArt id={shown.id} earned={!!shown.earnedOn} size={148} target={shown.target} />
          </View>
          <View style={s.text}>
            <Text variant="headline" align="center" accessibilityRole="header">
              {t(`milestones.badge.${shown.id}`)}
            </Text>
            <Text variant="body" tone="muted" align="center">
              {t(`milestones.rule.${shown.id}`, { count: shown.target })}
            </Text>
          </View>
          {shown.earnedOn ? (
            <Text variant="label" align="center">
              {t('milestones.earnedOn', { date: formatDayLabel(fromDayKey(shown.earnedOn), language) })}
            </Text>
          ) : (
            <View style={s.progress}>
              <View style={s.bar}>
                <ProgressBar value={shown.current / shown.target} />
              </View>
              <Text variant="numberSm" tone="muted">
                {`${fmt(shown.current)} / ${fmt(shown.target)}`}
              </Text>
            </View>
          )}
          <Button variant="ghost" label={t('common.close')} onPress={onClose} />
        </>
      )}
    </BottomSheet>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  // The sheet's own gap is xl; badge content sits a little tighter.
  content: { gap: theme.space.lg, marginTop: -theme.space.sm },
  art: { alignItems: 'center', paddingTop: theme.space.sm },
  text: { gap: theme.space.xs },
  progress: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  bar: { flex: 1, flexDirection: 'row' },
}));
