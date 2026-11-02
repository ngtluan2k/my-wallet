import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

/**
 * Daily "log your spending" reminder as local notifications. No server or push entitlement is
 * involved (the config plugin sets enableRemoteNotifications: false).
 *
 * Instead of one repeating notification, each day in the window gets its own notification, so the
 * reminder for today can be dropped once the user has logged something.
 */
const IDS_KEY = 'reminder-notification-ids';
/** Single repeating reminder from the first version; cancelled when rescheduling. */
const LEGACY_ID_KEY = 'reminder-notification-id';

/** Route opened when the user taps a reminder. Only this path is accepted from notification data. */
export const REMINDER_URL = '/transaction';

export interface ReminderContent {
  title: string;
  body: string;
}

export interface ReminderOptions {
  /** Time Sensitive interruption level (needs the time-sensitive entitlement in app.json). */
  prominent?: boolean;
}

/**
 * What makes a reminder hard to miss: a sound, a badge on the app icon that stays until the user
 * logs something (cleared by `clearReminderBadge`), and optionally Time Sensitive delivery.
 */
function notificationContent(content: ReminderContent, { prominent = false }: ReminderOptions = {}) {
  return {
    ...content,
    sound: 'default' as const,
    badge: 1,
    interruptionLevel: prominent ? ('timeSensitive' as const) : ('active' as const),
    data: { url: REMINDER_URL },
  };
}

let configured = false;

/** Shows reminders as a banner even while the app is open. Call once at startup. */
export function configureNotifications() {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: true,
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
  return allowed(await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: true } }));
}

async function cancelScheduled(): Promise<void> {
  const raw = await AsyncStorage.getItem(IDS_KEY);
  const legacy = await AsyncStorage.getItem(LEGACY_ID_KEY);
  const ids: string[] = [...(raw ? (JSON.parse(raw) as string[]) : []), ...(legacy ? [legacy] : [])];
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));
  await AsyncStorage.multiRemove([IDS_KEY, LEGACY_ID_KEY]);
}

/** Replaces all scheduled reminders with one notification at each of `times` (empty turns them off). */
export async function scheduleReminders(times: Date[], content: ReminderContent, options?: ReminderOptions): Promise<void> {
  await cancelScheduled();
  const ids: string[] = [];
  for (const date of times) {
    ids.push(
      await Notifications.scheduleNotificationAsync({
        content: notificationContent(content, options),
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
      }),
    );
  }
  if (ids.length) await AsyncStorage.setItem(IDS_KEY, JSON.stringify(ids));
}

/** Sends a reminder a few seconds from now so the user can see what it looks like. */
export async function sendTestReminder(content: ReminderContent, options?: ReminderOptions, seconds = 5): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: notificationContent(content, options),
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
  });
}

/** Removes the reminder badge from the app icon (after the user logged something, or reminders were turned off). */
export async function clearReminderBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}
