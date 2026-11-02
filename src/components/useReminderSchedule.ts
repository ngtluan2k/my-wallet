import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { today } from '@/domain/dates';
import { loggedOn, reminderTimes } from '@/domain/reminders';
import { useT } from '@/i18n';
import { configureNotifications, scheduleReminders } from '@/services/reminders';
import { useSettings } from '@/state/settings';
import { useTransactions } from '@/state/wallet';

/**
 * Keeps the scheduled reminders in step with settings (on/off, time, language of the text) and
 * with today's activity: once something is logged today, today's reminder is dropped. Also rolls
 * the scheduling window forward each time the app comes back to the foreground on a new day.
 * Mounted once in the root layout.
 */
export function useReminderSchedule() {
  const { t } = useT();
  const loaded = useSettings((s) => s.loaded);
  const enabled = useSettings((s) => s.reminderEnabled);
  const time = useSettings((s) => s.reminderTime);
  const transactions = useTransactions();

  const [day, setDay] = useState(today);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setDay(today());
    });
    return () => subscription.remove();
  }, []);

  const loggedToday = useMemo(() => loggedOn(transactions, day), [transactions, day]);

  useEffect(() => {
    if (!loaded) return;
    configureNotifications();
    const times = enabled ? reminderTimes(new Date(), time, loggedToday) : [];
    scheduleReminders(times, { title: t('reminder.title'), body: t('reminder.body') }).catch(() => {
      // Scheduling only fails without permission; the settings row explains how to allow it.
    });
  }, [loaded, enabled, time, loggedToday, day, t]);
}
