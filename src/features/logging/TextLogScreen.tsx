import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, TextInput, View, type TextInputInstance } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { itemMacros, sumMacros } from '@/domain/meal';
import { parseMeal } from '@/domain/parseMeal';
import { tap } from '@/lib/haptics';
import { formatNumber } from '@/lib/format';
import { getDish } from '@/mocks/dishes';
import { useLog } from '@/store/log';
import { makeStyles, useStyleContext } from '@/theme/ThemeProvider';
import { Icon, IconButton, Screen, Text } from '@/ui';

import { SaveBar } from './components/SaveBar';

/**
 * Voice-first logging: say (or type) what you ate, see the parsed dishes,
 * save. Parsing runs offline against the dish list.
 *
 * PLACEHOLDER: speech-to-text isn't wired yet — the mic fills in a sample
 * sentence. Burmese STT provider is an open decision (docs/DECISIONS.md).
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

  const [mode, setMode] = useState<'voice' | 'type'>('voice');
  const [listening, setListening] = useState(false);
  const [text, setText] = useState('');
  const input = useRef<TextInputInstance>(null);

  const items = parseMeal(text);
  const total = sumMacros(items).kcal;

  // Simulated recognition: stop after a moment with the sample sentence.
  useEffect(() => {
    if (!listening) return;
    const timer = setTimeout(() => {
      setText(t('textLog.demoTranscript'));
      setListening(false);
    }, 1600);
    return () => clearTimeout(timer);
  }, [listening, t]);

  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = listening ? withRepeat(withTiming(1, { duration: 900 }), -1, true) : withTiming(0);
  }, [listening, pulse]);
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.12 }] }));

  const save = () => {
    if (!items.length) return;
    if (id) {
      updateEntry(id, { items, confidence: 1, status: 'done' });
    } else {
      addEntry({ source: mode === 'voice' ? 'voice' : 'text', status: 'done', items });
    }
    router.dismissTo('/home');
  };

  const toggleMode = () => {
    setListening(false);
    setMode((m) => (m === 'voice' ? 'type' : 'voice'));
    if (mode === 'voice') setTimeout(() => input.current?.focus(), 100);
  };

  return (
    <KeyboardAvoidingView style={s.fill} behavior="padding">
      <Screen
        footer={
          <View style={s.footer}>
            {mode === 'voice' && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={listening ? t('textLog.listening') : t('textLog.tapToSpeak')}
                onPress={() => {
                  tap();
                  setListening((l) => !l);
                }}
                style={s.micWrap}>
                <Animated.View style={[s.micRing, ring, !listening && s.micRingIdle]} />
                <View style={s.mic}>
                  <Icon name="mic" size={34} color={theme.colors.onPrimary} />
                </View>
              </Pressable>
            )}
            {mode === 'voice' && (
              <Text variant="caption" tone="muted" align="center">
                {listening ? t('textLog.listening') : t('textLog.tapToSpeak')}
              </Text>
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
          <IconButton
            icon={mode === 'voice' ? 'keyboard' : 'mic'}
            accessibilityLabel={mode === 'voice' ? t('textLog.typeInstead') : t('textLog.speakInstead')}
            onPress={toggleMode}
          />
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.scroll}>
          {mode === 'type' ? (
            <TextInput
              ref={input}
              value={text}
              onChangeText={setText}
              multiline
              placeholder={t('textLog.placeholder')}
              placeholderTextColor={theme.colors.iconMuted}
              selectionColor={theme.colors.text}
              style={[type.headline, s.input]}
            />
          ) : (
            <Text variant="headline" tone={text ? 'default' : 'subtle'} style={s.transcript}>
              {text || t('textLog.placeholder')}
            </Text>
          )}

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

const MIC = 88;

const useStyles = makeStyles(({ theme }) => ({
  fill: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: theme.space.md },
  scroll: { paddingTop: theme.space.xxxl, gap: theme.space.xxl },
  transcript: { minHeight: 64 },
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
  micWrap: { alignSelf: 'center', width: MIC + 20, height: MIC + 20, alignItems: 'center', justifyContent: 'center' },
  micRing: { position: 'absolute', width: MIC + 20, height: MIC + 20, borderRadius: (MIC + 20) / 2, backgroundColor: theme.colors.surfaceStrong },
  micRingIdle: { backgroundColor: theme.colors.surface },
  mic: { width: MIC, height: MIC, borderRadius: MIC / 2, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
}));
