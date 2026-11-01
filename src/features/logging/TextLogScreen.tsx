import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, TextInput, View, type TextInputInstance } from 'react-native';
import { useTranslation } from 'react-i18next';

import { itemMacros, sumMacros } from '@/domain/meal';
import { parseMeal } from '@/domain/parseMeal';
import { formatNumber } from '@/lib/format';
import { getDish } from '@/data/dishes';
import { useLog } from '@/store/log';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Icon, IconButton, Screen, Text } from '@/ui';

import { SaveBar } from './components/SaveBar';

/**
 * Say or type what you ate, see the parsed dishes, save. Parsing runs offline
 * against the dish list, so it costs nothing.
 *
 * Speaking uses the phone keyboard's own voice typing (its mic key): no
 * speech service of ours, no cost, and it works wherever the keyboard
 * supports Burmese (docs/DECISIONS.md → "Voice through the keyboard").
 *
 * With `?id=` it replaces the items of an existing entry (PickDish → "other").
 */
export function TextLogScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t } = useTranslation();
  const s = useStyles();
  const { theme, language, type } = useStyleContext();
  const addEntry = useLog((st) => st.addEntry);
  const updateEntry = useLog((st) => st.updateEntry);

  const [text, setText] = useState('');
  const input = useRef<TextInputInstance>(null);

  const items = parseMeal(text);
  const total = sumMacros(items).kcal;

  // Open the keyboard once the screen has slid in, so its mic is one tap away.
  useEffect(() => {
    const timer = setTimeout(() => input.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  const save = () => {
    if (!items.length) return;
    if (id) {
      updateEntry(id, { items, confidence: 1, status: 'done' });
    } else {
      addEntry({ source: 'voice', status: 'done', items });
    }
    router.dismissTo('/home');
  };

  return (
    <KeyboardAvoidingView style={s.fill} behavior="padding">
      <Screen
        footer={
          <View style={s.footer}>
            {!text && (
              <View style={s.hint}>
                <Icon name="mic" size={16} color={theme.colors.textMuted} />
                <Text variant="caption" tone="muted">
                  {t('textLog.keyboardMic')}
                </Text>
              </View>
            )}
            <SaveBar
              label={t('textLog.save')}
              kcal={formatNumber(Math.round(total), language)}
              disabled={!items.length}
              onPress={save}
            />
          </View>
        }>
        <View style={s.header}>
          <IconButton icon="chevronLeft" accessibilityLabel={t('common.back')} onPress={() => router.back()} />
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.scroll}>
          <TextInput
            ref={input}
            value={text}
            onChangeText={setText}
            multiline
            placeholder={t('textLog.placeholder')}
            placeholderTextColor={theme.colors.iconMuted}
            selectionColor={theme.colors.selection}
            cursorColor={theme.colors.cursor}
            selectionHandleColor={theme.colors.cursor}
            style={[type.headline, s.input]}
          />

          <View style={s.items}>
            {items.map((item, i) => {
              const dish = getDish(item.dishId);
              return (
                <View key={`${item.dishId}-${i}`} style={s.item}>
                  <Text variant="body" style={s.flex}>
                    {dish.name[language]}
                    {item.sweetness ? ` · ${t(`search.${item.sweetness}`)}` : ''}
                    {item.qty !== 1 ? ` ×${formatNumber(item.qty, language)}` : ''}
                  </Text>
                  <Text variant="numberSm">{formatNumber(Math.round(itemMacros(item).kcal), language)}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles(({ theme }) => ({
  fill: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: theme.space.md },
  scroll: { paddingTop: theme.space.xxxl, gap: theme.space.xxl },
  input: { minHeight: 96, color: theme.colors.text, textAlignVertical: 'top', padding: 0 },
  items: { gap: theme.space.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    minHeight: 52,
    paddingHorizontal: theme.space.lg,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
  },
  footer: { gap: theme.space.md, alignItems: 'stretch' },
  hint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.space.xs },
}));
