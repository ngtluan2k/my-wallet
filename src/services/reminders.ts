import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

/**
 * Daily "log your spending" reminder as a local notification. No server or push entitlement is
 * involved (the config plugin sets enableRemoteNotifications: false).
 */
const ID_KEY = 'reminder-notification-id';

let configured = false;

/** Shows reminders as a banner even while the app is open. Call once at startup. */
export function configureNotifications() {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/** Asks for permission if it hasn't been decided yet. Returns whether notifications can be shown. */
export async function ensureNotificationPermission(): Promise<boolean> {
  const allowed = (s: Notifications.NotificationPermissionsStatus) =>
    // The enum is re-exported from a types module that eslint-plugin-import can't follow; tsc checks it.
    // eslint-disable-next-line import/namespace
    s.granted || s.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  const current = await Notifications.getPermissionsAsync();
  if (allowed(current)) return true;
  if (!current.canAskAgain) return false;
  return allowed(await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } }));
}

/**
 * Replaces the scheduled reminder: cancels the previous one, then schedules `time` (`HH:mm`) daily,
 * or nothing when `time` is null.
 */
export async function scheduleDailyReminder(time: string | null, content: { title: string; body: string }): Promise<void> {
  const previous = await AsyncStorage.getItem(ID_KEY);
  if (previous) {
    await Notifications.cancelScheduledNotificationAsync(previous).catch(() => undefined);
    await AsyncStorage.removeItem(ID_KEY);
  }
  if (!time) return;
  const [hour, minute] = time.split(':').map(Number);
  const id = await Notifications.scheduleNotificationAsync({
    content,
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
  });
  await AsyncStorage.setItem(ID_KEY, id);
}
