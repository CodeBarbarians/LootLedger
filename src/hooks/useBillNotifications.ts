import { getDate, subDays } from 'date-fns';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { getNextDueDate } from '../db/repositories/bills';
import type { Bill } from '../db/types';
import { formatAmount } from '../utils/currency';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const REMINDER_HOUR = 9;
const REMINDER_MINUTE = 0;
const ANDROID_CHANNEL_ID = 'bills';

// Deterministic per-bill identifier, so a reminder can always be cancelled/replaced by
// bill id alone — no need to persist the id expo-notifications hands back on scheduling.
function billReminderId(billId: number): string {
  return `bill-reminder-${billId}`;
}

// due_day has no day-of-week component (it's a plain 1-31 day-of-month field shared with
// monthly/yearly bills), so a weekly bill's reminder weekday is derived from it rather
// than stored separately.
function weeklyReminderWeekday(dueDay: number, reminderDaysBefore: number): number {
  const dueWeekday = ((dueDay - 1) % 7) + 1; // 1 (Sun) - 7 (Sat)
  const offset = ((reminderDaysBefore % 7) + 7) % 7;
  return ((dueWeekday - 1 - offset + 7) % 7) + 1;
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Bill reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function requestBillNotificationPermission(): Promise<boolean> {
  await ensureAndroidChannel();
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (!existing.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export function useBillNotificationPermission(): void {
  useEffect(() => {
    requestBillNotificationPermission();
  }, []);
}

export async function cancelBillReminder(billId: number): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(billReminderId(billId));
}

type SchedulableBill = Pick<
  Bill,
  'id' | 'name' | 'amount' | 'due_day' | 'recurrence' | 'reminder_days_before' | 'archived'
>;

/** Cancels any existing reminder for this bill and, if it's active and permission was
 * granted, schedules its replacement. A denied/undetermined permission leaves the bill
 * with no reminder rather than throwing — the caller doesn't need to branch on it. */
export async function scheduleBillReminder(bill: SchedulableBill, symbol: string): Promise<void> {
  await cancelBillReminder(bill.id);
  if (bill.archived) return;

  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return;

  const content = {
    title: 'Bill due soon',
    body: `${bill.name} — ${formatAmount(bill.amount, symbol)}`,
  };
  const identifier = billReminderId(bill.id);

  // The WEEKLY/MONTHLY/YEARLY triggers only hold a single static weekday/day/month, so
  // the "N days before" offset is resolved once against the bill's next due date rather
  // than recomputed every cycle. For a monthly/yearly bill whose offset crosses a month
  // boundary (e.g. due day 3, reminder 5 days before), the resulting day-of-month can
  // drift by a day or two in shorter months — an acceptable trade-off for a reminder that
  // only needs to land roughly N days ahead, not to the exact day every time.
  const reminderDate = subDays(getNextDueDate(bill.due_day), bill.reminder_days_before);

  if (bill.recurrence === 'weekly') {
    await Notifications.scheduleNotificationAsync({
      identifier,
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: weeklyReminderWeekday(bill.due_day, bill.reminder_days_before),
        hour: REMINDER_HOUR,
        minute: REMINDER_MINUTE,
      },
    });
  } else if (bill.recurrence === 'yearly') {
    await Notifications.scheduleNotificationAsync({
      identifier,
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.YEARLY,
        day: getDate(reminderDate),
        month: reminderDate.getMonth(), // JS Date month: 0 = January
        hour: REMINDER_HOUR,
        minute: REMINDER_MINUTE,
      },
    });
  } else {
    await Notifications.scheduleNotificationAsync({
      identifier,
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        day: getDate(reminderDate),
        hour: REMINDER_HOUR,
        minute: REMINDER_MINUTE,
      },
    });
  }
}
