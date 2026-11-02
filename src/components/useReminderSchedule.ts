import { useEffect } from 'react';

import { useT } from '@/i18n';
import { configureNotifications, scheduleDailyReminder } from '@/services/reminders';
import { useSettings } from '@/state/settings';

/**
 * Keeps the scheduled daily reminder in step with settings (on/off, time, and language of the
 * text). Mounted once in the root layout.
 */
export function useReminderSchedule() {
  const { t, language } = useT();
  const loaded = useSettings((s) => s.loaded);
  const enabled = useSettings((s) => s.reminderEnabled);
  const time = useSettings((s) => s.reminderTime);

  useEffect(() => {
    if (!loaded) return;
    configureNotifications();
    scheduleDailyReminder(enabled ? time : null, { title: t('reminder.title'), body: t('reminder.body') }).catch(() => {
      // Scheduling only fails without permission; the settings row explains how to allow it.
    });
    // `t` changes with `language`; listing language keeps the intent explicit.
  }, [loaded, enabled, time, language, t]);
}
