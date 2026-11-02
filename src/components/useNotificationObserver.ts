import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { REMINDER_URL } from '@/services/reminders';

/**
 * Opens the add-transaction screen when the user taps a reminder, including when the tap launched
 * the app. The route is only pushed once the app is ready (signed in, data loaded); the lock screen
 * still covers it until the user unlocks. Only the known reminder route is accepted.
 */
export function useNotificationObserver(ready: boolean) {
  const readyRef = useRef(ready);
  const pending = useRef(false);

  useEffect(() => {
    function take(response: Notifications.NotificationResponse | null | undefined) {
      if (response?.notification.request.content.data?.url !== REMINDER_URL) return;
      Notifications.clearLastNotificationResponse();
      if (readyRef.current) router.push(REMINDER_URL);
      else pending.current = true;
    }
    take(Notifications.getLastNotificationResponse());
    const subscription = Notifications.addNotificationResponseReceivedListener(take);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    readyRef.current = ready;
    if (ready && pending.current) {
      pending.current = false;
      router.push(REMINDER_URL);
    }
  }, [ready]);
}
