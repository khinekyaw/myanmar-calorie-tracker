import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { BADGE_GROUPS, type BadgeStatus } from '@/domain/badges';
import { formatNumber } from '@/lib/format';
import { tap } from '@/lib/haptics';
import { useStreak } from '@/store/log';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Card, IconButton, ProgressBar, StreakFlame, Text } from '@/ui';

import { BadgeArt, BadgesEarnedArt } from './BadgeArt';
import { BadgeSheet } from './BadgeSheet';
import { useBadges } from './useBadges';

/** Streak and badges: what you've earned and what's next. Opened from the streak pill. */
export function MilestonesScreen() {
  const { t } = useTranslation();
  const s = useStyles();
  const { language } = useStyleContext();
  const streak = useStreak();
  const { badges, longest, earned } = useBadges();
  const [open, setOpen] = useState<BadgeStatus | null>(null);
  const n = (v: number) => formatNumber(v, language);

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <IconButton
            icon="chevronLeft"
            accessibilityLabel={t('common.back')}
            // Opened from a link there's nothing behind it: go Home instead.
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
          />
        </View>
        <Text variant="title" accessibilityRole="header">
          {t('milestones.title')}
        </Text>

        <View style={s.hero}>
          <View style={s.heroItem} accessible accessibilityLabel={t('home.streak', { count: streak })}>
            <StreakFlame size={72} active={streak > 0} />
            <Text variant="numberLg">{n(streak)}</Text>
            <Text variant="label" tone="muted" align="center">
              {t('milestones.dayStreak')}
            </Text>
          </View>
          <View style={s.heroItem} accessible accessibilityLabel={`${t('milestones.badgesEarned')} ${n(earned)}`}>
            <View style={s.heroMedal}>
              <BadgesEarnedArt size={72} active={earned > 0} />
            </View>
            <Text variant="numberLg">{n(earned)}</Text>
            <Text variant="label" tone="muted" align="center">
              {t('milestones.badgesEarned')}
            </Text>
          </View>
        </View>

        <View style={s.stats}>
          <Card size="md" style={s.stat}>
            <Text variant="bodyStrong">{t('milestones.days', { count: longest, value: n(longest) })}</Text>
            <Text variant="caption" tone="muted">
              {t('milestones.longest')}
            </Text>
          </Card>
          <Card size="md" style={s.stat}>
            <Text variant="bodyStrong">{`${n(earned)}/${n(badges.length)}`}</Text>
            <View style={s.bar}>
              <ProgressBar value={earned / badges.length} />
            </View>
          </Card>
        </View>

        {BADGE_GROUPS.map((group) => {
          const list = badges.filter((b) => b.group === group);
          if (!list.length) return null;
          return (
            <View key={group} style={s.section}>
              <Text variant="caption" tone="subtle" accessibilityRole="header">
                {t(`milestones.group.${group}`)}
              </Text>
              <View style={s.grid}>
                {list.map((b) => (
                  <BadgeCell
                    key={b.id}
                    badge={b}
                    onPress={() => {
                      tap();
                      setOpen(b);
                    }}
                  />
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
      <BadgeSheet badge={open} onClose={() => setOpen(null)} />
    </SafeAreaView>
  );
}

function BadgeCell({ badge, onPress }: { badge: BadgeStatus; onPress: () => void }) {
  const { t } = useTranslation();
  const s = useStyles();
  const name = t(`milestones.badge.${badge.id}`);
  const rule = t(`milestones.rule.${badge.id}`, { count: badge.target });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}. ${rule}. ${t(badge.earnedOn ? 'milestones.earned' : 'milestones.locked')}`}
      onPress={onPress}
      style={({ pressed }) => [s.cell, pressed && s.pressed]}>
      <BadgeArt id={badge.id} earned={!!badge.earnedOn} size={84} target={badge.target} />
      <Text variant="label" align="center" numberOfLines={2}>
        {name}
      </Text>
      <Text variant="caption" tone="muted" align="center" numberOfLines={2}>
        {rule}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  root: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: theme.gutter, paddingBottom: theme.space.xxxl, gap: theme.space.lg },
  header: { flexDirection: 'row', paddingTop: theme.space.sm },
  hero: { flexDirection: 'row', paddingTop: theme.space.sm },
  heroItem: { flex: 1, alignItems: 'center', gap: theme.space.xs },
  heroMedal: { height: 72, justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: theme.space.sm },
  stat: { flex: 1, gap: theme.space.xs, justifyContent: 'center' },
  bar: { flexDirection: 'row', paddingTop: theme.space.xs },
  section: { gap: theme.space.md, paddingTop: theme.space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: theme.space.xl },
  cell: { width: '33.333%', alignItems: 'center', gap: theme.space.xs, paddingHorizontal: theme.space.xs },
  pressed: { opacity: theme.opacity.pressed },
}));
