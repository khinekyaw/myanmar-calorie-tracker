import { Image, type ImageSource } from 'expo-image';
import { View } from 'react-native';

import type { BadgeId } from '@/domain/badges';
import { formatNumber } from '@/lib/format';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Text } from '@/ui';

import { DiamondBadge } from './DiamondBadge';

/**
 * One transparent SVG per badge in assets/badges/<id>.svg (traced from the
 * generated art; prompt and sources in docs/BADGES.md). A new badge needs its
 * picture here before it compiles.
 */
const ART: Record<BadgeId, ImageSource> = {
  streak3: require('../../../assets/badges/streak3.svg'),
  streak7: require('../../../assets/badges/streak7.svg'),
  streak30: require('../../../assets/badges/streak30.svg'),
  streak100: require('../../../assets/badges/streak100.svg'),
  streak365: require('../../../assets/badges/streak365.svg'),
  meals1: require('../../../assets/badges/meals1.svg'),
  meals10: require('../../../assets/badges/meals10.svg'),
  meals50: require('../../../assets/badges/meals50.svg'),
  meals200: require('../../../assets/badges/meals200.svg'),
  meals500: require('../../../assets/badges/meals500.svg'),
  threeMeals: require('../../../assets/badges/threeMeals.svg'),
  firstScan: require('../../../assets/badges/firstScan.svg'),
  firstVoice: require('../../../assets/badges/firstVoice.svg'),
  sharedTable: require('../../../assets/badges/sharedTable.svg'),
  mohingaMorning: require('../../../assets/badges/mohingaMorning.svg'),
  teaShop: require('../../../assets/badges/teaShop.svg'),
  laphetLover: require('../../../assets/badges/laphetLover.svg'),
  riceInCheck: require('../../../assets/badges/riceInCheck.svg'),
  onTarget: require('../../../assets/badges/onTarget.svg'),
  proteinPower: require('../../../assets/badges/proteinPower.svg'),
  firstWeighIn: require('../../../assets/badges/firstWeighIn.svg'),
  weeklyCheckIn: require('../../../assets/badges/weeklyCheckIn.svg'),
  first5lb: require('../../../assets/badges/first5lb.svg'),
  halfway: require('../../../assets/badges/halfway.svg'),
  goalReached: require('../../../assets/badges/goalReached.svg'),
};

/** Badges whose target is a share of the weight goal. */
export const PERCENT = new Set<BadgeId>(['halfway', 'goalReached']);

type Props = { id: BadgeId; earned: boolean; size: number; target: number };

/**
 * A badge: its object on a grey circle, the number in an ink pill below it.
 * Earned = the drawing in colour; locked = the same drawing in faded grey. The art
 * carries no frame or digits, so numbers stay crisp and follow the language.
 */
export function BadgeArt({ id, earned, size, target }: Props) {
  const s = useStyles();
  const { theme, language } = useStyleContext();
  const art = ART[id];
  const circle = { width: size, height: size, borderRadius: size / 2 };
  const inner = { width: size * 0.72, height: size * 0.72 };

  const picture = earned ? (
    <Image source={art} style={inner} contentFit="contain" accessible={false} />
  ) : (
    // Greyscale and faded, so the drawing still reads (tintColor doesn't reach SVGs).
    <View style={[inner, s.locked]}>
      <Image source={art} style={inner} contentFit="contain" accessible={false} />
    </View>
  );

  return (
    <View style={[s.root, { width: size }]}>
      <View style={[s.circle, circle, s.surface]}>{picture}</View>
      {target > 1 && (
        <View style={[s.pill, earned ? s.pillEarned : s.pillLocked]}>
          <Text variant="numberSm" color={earned ? theme.colors.onPrimary : theme.colors.textMuted}>
            {`${formatNumber(target, language)}${PERCENT.has(id) ? '%' : ''}`}
          </Text>
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  root: { alignItems: 'center', paddingBottom: theme.space.sm },
  circle: { alignItems: 'center', justifyContent: 'center', borderWidth: 0 },
  surface: { backgroundColor: theme.colors.surface },
  locked: { filter: [{ grayscale: 1 }], opacity: theme.opacity.disabled },
  // Sits over the circle's bottom edge, with a white ring to separate it.
  pill: {
    position: 'absolute',
    bottom: 0,
    minWidth: 32,
    height: 24,
    paddingHorizontal: theme.space.sm,
    borderRadius: theme.radius.pill,
    borderWidth: 2,
    borderColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillEarned: { backgroundColor: theme.colors.primary },
  pillLocked: { backgroundColor: theme.colors.surfaceStrong },
}));

/** "Badges earned" on the Milestones hero: the coin is its own circle, no number pill (the count sits below it). */
export function BadgesEarnedArt({ size, active }: { size: number; active: boolean }) {
  return <DiamondBadge size={size} active={active} />;
}
