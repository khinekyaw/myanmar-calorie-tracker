import { TabList, TabSlot, Tabs, TabTrigger } from 'expo-router/ui';
import { useTranslation } from 'react-i18next';

import { AddButton, TabBarButton, useTabBarStyles } from '@/features/navigation/TabBar';

/**
 * Headless expo-router tabs with our own bar: icons only (Home, Progress,
 * Settings) plus the floating black + button that opens the add sheet.
 */
export default function TabsLayout() {
  const { t } = useTranslation();
  const s = useTabBarStyles();
  return (
    <Tabs style={s.root}>
      <TabSlot />
      <TabList style={s.bar}>
        <TabTrigger name="home" href="/home" asChild>
          <TabBarButton icon="home" label={t('tabs.home')} />
        </TabTrigger>
        <TabTrigger name="progress" href="/progress" asChild>
          <TabBarButton icon="chart" label={t('tabs.progress')} />
        </TabTrigger>
        <TabTrigger name="settings" href="/settings" asChild>
          <TabBarButton icon="sliders" label={t('tabs.settings')} />
        </TabTrigger>
      </TabList>
      <AddButton label={t('tabs.add')} />
    </Tabs>
  );
}
