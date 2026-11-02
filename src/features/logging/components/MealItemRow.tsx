import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { itemMacros, itemName, type MealItem } from '@/domain/meal';
import { formatNumber, formatPlates } from '@/lib/format';
import { getDish } from '@/data/dishes';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Stepper, Text } from '@/ui';

import { amountLabel } from '../amountLabel';

type Props = {
  item: MealItem;
  onChange: (qty: number) => void;
  /** 0 = the row can be set to "didn't eat" (ဝိုင်းစား). */
  min?: number;
  /** Divider under the row. */
  divider?: boolean;
};

/** One dish in a meal: name, amount · grams · kcal, and a − / + stepper. */
export function MealItemRow({ item, onChange, min = 0, divider = true }: Props) {
  const { t } = useTranslation();
  const s = useStyles();
  const { language } = useStyleContext();
  const dish = getDish(item.dishId);
  const name = itemName(item, language);
  const off = item.qty === 0;
  const step = dish.unit === 'spoon' || dish.unit === 'piece' ? 1 : 0.5;
  return (
    <View style={[s.row, divider && s.divider]}>
      <View style={s.flex}>
        <Text variant="body" tone={off ? 'subtle' : 'default'}>
          {name}
        </Text>
        <Text variant="caption" tone="subtle">
          {off
            ? t('shared.notEaten')
            : `${amountLabel(t, dish, item.qty, language)} · ${formatNumber(Math.round(itemMacros(item).kcal), language)}`}
        </Text>
      </View>
      <Stepper
        value={item.qty}
        step={step}
        min={Math.max(min, 0)}
        max={30}
        display={formatPlates(item.qty, language) || '0'}
        onChange={onChange}
        decreaseLabel={`${name} ${t('result.less')}`}
        increaseLabel={`${name} ${t('result.more')}`}
      />
    </View>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md, minHeight: 68, paddingVertical: theme.space.sm },
  divider: { borderBottomWidth: 1, borderBottomColor: theme.colors.hairline },
}));
