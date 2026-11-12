import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { useSettings } from '@/store/settings';

const ID = 'weekly-report';
const CHANNEL = 'weekly-report';
const URL = '/week';

// Loaded on demand, like the onboarding permission request.
const load = () => import('expo-notifications');
type Notifications = Awaited<ReturnType<typeof load>>;

/**
 * Android shows the notification under this category in the phone's settings.
 * Returns the channel to use, or undefined for the default one when Android
 * refuses to create it (seen in Expo Go: a NullPointerException), so the
 * notification still arrives.
 */
async function ensureChannel(N: Notifications, t: TFunction): Promise<string | undefined> {
  if (Platform.OS !== 'android') return undefined;
  try {
    await N.setNotificationChannelAsync(CHANNEL, {
      name: t('report.title'),
      importance: N.AndroidImportance.DEFAULT,
    });
    return CHANNEL;
  } catch (e) {
    console.warn('[reminder] notification channel not created, using the default', e);
    return undefined;
  }
}

const content = (t: TFunction) => ({ title: t('report.notifyTitle'), body: t('report.notifyBody'), data: { url: URL } });

/**
 * Developer menu only: the same notification 5 seconds from now, so it can be
 * seen without waiting for Monday (leave the app to see it in the shade).
 * Returns false when notifications aren't allowed.
 */
export async function previewWeeklyReminder(t: TFunction): Promise<boolean> {
  try {
    const N = await load();
    if (!(await N.requestPermissionsAsync()).granted) return false;
    const channelId = await ensureChannel(N, t);
    await N.scheduleNotificationAsync({
      content: content(t),
      trigger: { type: N.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId },
    });
    return true;
  } catch (e) {
    console.warn('[reminder] preview failed', e);
    return false;
  }
}

/**
 * Monday 8:00 (phone time) "your weekly report is ready", opening the Week
 * screen. Scheduled while reminders are on and the permission is granted;
 * rescheduled when the language changes so the text follows it.
 */
export function useWeeklyReminder() {
  const { t } = useTranslation();
  const reminders = useSettings((s) => s.reminders);

  useEffect(() => {
    let stale = false;
    (async () => {
      const N = await load();
      await N.cancelScheduledNotificationAsync(ID);
      if (stale || !reminders || !(await N.getPermissionsAsync()).granted) return;
      const channelId = await ensureChannel(N, t);
      await N.scheduleNotificationAsync({
        identifier: ID,
        content: content(t),
        // Weekdays count from Sunday = 1.
        trigger: { type: N.SchedulableTriggerInputTypes.WEEKLY, weekday: 2, hour: 8, minute: 0, channelId },
      });
    })().catch(() => {});
    return () => {
      stale = true;
    };
  }, [reminders, t]);

  // Tapping it opens the report, also when it started the app.
  useEffect(() => {
    let remove = () => {};
    load()
      .then((N) => {
        N.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });
        const open = (data: Record<string, unknown> | undefined) => {
          if (data?.url !== URL) return;
          N.clearLastNotificationResponse();
          router.push(URL);
        };
        open(N.getLastNotificationResponse()?.notification.request.content.data);
        const sub = N.addNotificationResponseReceivedListener((r) => open(r.notification.request.content.data));
        remove = () => sub.remove();
      })
      .catch(() => {});
    return () => remove();
  }, []);
}
