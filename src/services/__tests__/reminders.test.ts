import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import { REMINDER_URL, scheduleReminders, sendTestReminder } from '../reminders';

jest.mock('expo-notifications', () => {
  let n = 0;
  return {
    SchedulableTriggerInputTypes: { DATE: 'date', TIME_INTERVAL: 'timeInterval' },
    scheduleNotificationAsync: jest.fn(async () => `n${++n}`),
    cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  };
});

const schedule = Notifications.scheduleNotificationAsync as jest.Mock;
const cancel = Notifications.cancelScheduledNotificationAsync as jest.Mock;
const content = { title: 'Ví Mình', body: 'Ghi lại nhé' };

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

describe('reminder scheduling', () => {
  it('schedules one dated notification per time, linking to Add transaction', async () => {
    const times = [new Date(2026, 10, 3, 21), new Date(2026, 10, 4, 21)];
    await scheduleReminders(times, content);
    expect(schedule).toHaveBeenCalledTimes(2);
    expect(schedule).toHaveBeenCalledWith({
      content: { ...content, data: { url: REMINDER_URL } },
      trigger: { type: 'date', date: times[0] },
    });
  });

  it('cancels the previous batch and the old repeating reminder before rescheduling', async () => {
    await AsyncStorage.setItem('reminder-notification-id', 'legacy');
    await scheduleReminders([new Date(2026, 10, 3, 21)], content);
    const [first] = await Promise.all(schedule.mock.results.map((r) => r.value));
    expect(cancel).toHaveBeenCalledWith('legacy');

    cancel.mockClear();
    await scheduleReminders([], content); // turned off
    expect(cancel).toHaveBeenCalledWith(first);
    expect(await AsyncStorage.getItem('reminder-notification-ids')).toBeNull();
  });

  it('sends a test notification a few seconds later', async () => {
    await sendTestReminder(content);
    expect(schedule).toHaveBeenCalledWith(expect.objectContaining({ trigger: { type: 'timeInterval', seconds: 5 } }));
  });
});
