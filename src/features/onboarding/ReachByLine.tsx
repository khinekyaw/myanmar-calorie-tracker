import { useTranslation } from 'react-i18next';

import { formatMonthYear } from '@/lib/format';
import { useStyleContext } from '@/theme/ThemeProvider';
import { Text } from '@/ui';

/**
 * "Reach it by February 2027". When there's no date (target = current weight)
 * the line stays in the layout, invisible, so the screen doesn't jump.
 */
export function ReachByLine({ date }: { date: Date | null }) {
  const { t } = useTranslation();
  const { language } = useStyleContext();
  // Same sentence with a dash keeps the same script, font and line height.
  const text = t('target.reachBy', { date: date ? formatMonthYear(date, language) : '—' });
  return (
    <Text
      variant="label"
      tone="muted"
      align="center"
      style={!date && { opacity: 0 }}
      accessibilityElementsHidden={!date}
      importantForAccessibility={date ? 'auto' : 'no-hide-descendants'}>
      {text}
    </Text>
  );
}
