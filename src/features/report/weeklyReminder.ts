import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useSettings } from '@/store/settings';

const ID = 'weekly-report';
const CHANNEL = 'weekly-report';
const URL = '/week';

// Loaded on demand, like the onboarding permission request.
const load = () => import('expo-notifications');

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
      if (Platform.OS === 'android') {
        await N.setNotificationChannelAsync(CHANNEL, {
          name: t('report.title'),
          importance: N.AndroidImportance.DEFAULT,
        });
      }
      await N.scheduleNotificationAsync({
        identifier: ID,
        content: { title: t('report.notifyTitle'), body: t('report.notifyBody'), data: { url: URL } },
        // Weekdays count from Sunday = 1.
        trigger: { type: N.SchedulableTriggerInputTypes.WEEKLY, weekday: 2, hour: 8, minute: 0, channelId: CHANNEL },
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
