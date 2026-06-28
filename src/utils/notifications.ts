import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { Habit } from '../types';

export const ACTION_MARK_DONE = 'MARK_DONE';

export const FREQUENCY_OPTIONS = [
  { key: 'daily', label: 'Cada día', icon: 'day' },
  { key: 'interval-days', label: 'Cada X días', icon: 'calendar' },
  { key: 'interval-weeks', label: 'Cada X semanas', icon: 'calendar' },
  { key: 'interval-months', label: 'Cada X meses', icon: 'calendar' },
];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function setupNotificationCategories(): Promise<void> {
  try {
    await Notifications.setNotificationCategoryAsync('habit-reminder', [
      {
        identifier: ACTION_MARK_DONE,
        buttonTitle: '✓ Completada',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);
  } catch (e) {
    console.warn('No se pudieron configurar categorías de notificación:', (e as Error).message);
  }
}

export async function requestPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    return false;
  }
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return false;
  }
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('habit-reminders', {
      name: 'Recordatorios de hábitos',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4F8EF7',
      sound: 'default',
    });
  }
  return true;
}

export async function scheduleHabitNotification(habit: Habit): Promise<{ primary: string | null; others: string[] }> {
  if (habit.notificationIds && habit.notificationIds.length > 0) {
    for (const nid of habit.notificationIds) {
      try {
        await Notifications.cancelScheduledNotificationAsync(nid);
      } catch (e) {}
    }
  }
  if (habit.notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(habit.notificationId);
    } catch (e) {}
  }

  if (!habit.reminderEnabled) return { primary: null, others: [] };

  const { hour, minute } = habit.reminderTime;
  const frequency = habit.reminderFrequency || 'daily';
  const intervalValue = habit.reminderInterval || 1;

  const notifContent = {
    title: `⏰ ${habit.name}`,
    body: habit.dose || 'No olvides tu hábito de hoy',
    sound: 'default' as const,
    data: { habitId: habit.id },
    categoryIdentifier: 'habit-reminder',
    channelId: 'habit-reminders',
  };

  try {
    if (frequency === 'daily') {
      const specificDays: number[] = habit.reminderDays || [];
      if (specificDays.length > 0) {
        const now = new Date();
        const allIds: string[] = [];
        for (let i = 0; i < 60; i++) {
          const triggerDate = new Date(now);
          triggerDate.setDate(triggerDate.getDate() + i);
          const dow = triggerDate.getDay();
          const normalizedDow = dow === 0 ? 6 : dow - 1;
          if (!specificDays.includes(normalizedDow)) continue;
          triggerDate.setHours(hour, minute, 0, 0);
          if (triggerDate <= now) continue;
          const id = await Notifications.scheduleNotificationAsync({
            content: notifContent,
            trigger: { type: 'date' as any, date: triggerDate },
          });
          allIds.push(id);
        }
        return { primary: allIds[0] || null, others: allIds.slice(1) };
      }
      const id = await Notifications.scheduleNotificationAsync({
        content: notifContent,
        trigger: { type: 'daily' as any, hour, minute },
      });
      return { primary: id, others: [] };
    }

    const allIds: string[] = [];
    const now = new Date();

    const scheduleDate = (triggerDate: Date): Promise<string> =>
      Notifications.scheduleNotificationAsync({
        content: notifContent,
        trigger: { type: 'date' as any, date: triggerDate },
      });

    if (frequency === 'interval-days') {
      const totalDays = intervalValue;
      const notifCount = Math.min(totalDays, 60);
      for (let i = 0; i < notifCount; i++) {
        const triggerDate = new Date(now);
        triggerDate.setDate(triggerDate.getDate() + (i * totalDays));
        triggerDate.setHours(hour, minute, 0, 0);
        if (triggerDate <= now) continue;
        const id = await scheduleDate(triggerDate);
        allIds.push(id);
      }
    } else if (frequency === 'interval-weeks') {
      const totalWeeks = intervalValue;
      const notifCount = Math.min(totalWeeks, 26);
      for (let i = 0; i < notifCount; i++) {
        const triggerDate = new Date(now);
        triggerDate.setDate(triggerDate.getDate() + (i * totalWeeks * 7));
        triggerDate.setHours(hour, minute, 0, 0);
        if (triggerDate <= now) continue;
        const id = await scheduleDate(triggerDate);
        allIds.push(id);
      }
    } else if (frequency === 'interval-months') {
      const totalMonths = intervalValue;
      const notifCount = Math.min(totalMonths, 12);
      for (let i = 0; i < notifCount; i++) {
        const triggerDate = new Date(now);
        triggerDate.setMonth(triggerDate.getMonth() + (i * totalMonths));
        triggerDate.setHours(hour, minute, 0, 0);
        if (triggerDate <= now) continue;
        const id = await scheduleDate(triggerDate);
        allIds.push(id);
      }
    }

    return { primary: allIds[0] || null, others: allIds.slice(1) };
  } catch (e) {
    console.warn('Notificación no disponible en este entorno:', (e as Error).message);
    return { primary: null, others: [] };
  }
}

export async function cancelHabitNotification(notificationId: string | null | undefined): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (e) {}
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

type NotificationCallback = (notification: Notifications.Notification) => void;
type ResponseCallback = (response: Notifications.NotificationResponse) => void;

export function useNotificationListener(onReceive: NotificationCallback, onResponse: ResponseCallback) {
  return {
    receiveListener: Notifications.addNotificationReceivedListener(onReceive),
    responseListener: Notifications.addNotificationResponseReceivedListener(onResponse),
  };
}
