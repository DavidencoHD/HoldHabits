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
        buttonTitle: '✓ Completar',
        options: {
          opensAppToForeground: true,
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

/** JS: 0=domingo … 6=sábado → expo-notifications: 1=domingo … 7=sábado */
function toExpoWeekday(dow: number): number {
  return dow + 1;
}

function addMonthsClamped(date: Date, months: number): Date {
  const year = date.getFullYear();
  const month = date.getMonth() + months;
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(date.getDate(), lastDay));
}

/**
 * Próximas fechas de un recordatorio que se repite cada X días/semanas/meses.
 * Se calculan desde `createdAt` para que no se desplacen con el tiempo.
 */
export function nextIntervalDates(
  frequency: string,
  interval: number,
  hour: number,
  minute: number,
  anchorStr: string | undefined,
  count: number,
  now: Date = new Date()
): Date[] {
  const step = Math.max(1, interval || 1);
  const anchor = anchorStr ? new Date(`${anchorStr}T12:00:00`) : new Date(now);
  const dates: Date[] = [];

  if (frequency === 'interval-months') {
    for (let k = 0; k < 600 && dates.length < count; k++) {
      const d = addMonthsClamped(anchor, k * step);
      d.setHours(hour, minute, 0, 0);
      if (d > now) dates.push(d);
    }
    return dates;
  }

  const stepDays = frequency === 'interval-weeks' ? step * 7 : step;

  const build = (k: number) => {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() + k * stepDays);
    d.setHours(hour, minute, 0, 0);
    return d;
  };

  let k = 0;
  while (k < 5000 && build(k) <= now) k++;
  for (; k < 5000 && dates.length < count; k++) dates.push(build(k));

  return dates;
}

/** Un recordatorio con fechas finitas debe reprogramarse al abrir la app. */
export function needsScheduleRefresh(habit: Habit): boolean {
  const frequency = habit.reminderFrequency || 'daily';
  const interval = habit.reminderInterval || 1;
  if (frequency === 'daily') return false;
  if (frequency === 'interval-days' && interval === 1) return false;
  if (frequency === 'interval-weeks' && interval === 1) return false;
  return true;
}

const FINITE_SCHEDULE_COUNT = 12;

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

  const times = habit.reminderTimes?.length ? habit.reminderTimes : [{ hour: 9, minute: 0 }];
  const frequency = habit.reminderFrequency || 'daily';
  const intervalValue = habit.reminderInterval || 1;
  const allIds: string[] = [];

  for (const rt of times) {
    const { hour, minute } = rt;

    const notifContent = {
      title: `⏰ ${habit.name}`,
      body: habit.dose ? `${habit.dose} — ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` : `Recordatorio de las ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      sound: 'default' as const,
      data: { habitId: habit.id },
      categoryIdentifier: 'habit-reminder',
      channelId: 'habit-reminders',
    };

    try {
      if (frequency === 'daily') {
        const specificDays: number[] = habit.reminderDays || [];
        if (specificDays.length === 0) {
          // Un único trigger repetido: no caduca y ocupa una sola alarma.
          const id = await Notifications.scheduleNotificationAsync({
            content: notifContent,
            trigger: { type: 'daily' as any, hour, minute },
          });
          allIds.push(id);
          continue;
        }

        // Días concretos: un trigger semanal por día (máximo 7 alarmas).
        for (const day of specificDays) {
          // reminderDays: 0=lunes … 6=domingo → día de la semana de JS → expo
          const jsDow = (day + 1) % 7;
          const id = await Notifications.scheduleNotificationAsync({
            content: notifContent,
            trigger: { type: 'weekly' as any, weekday: toExpoWeekday(jsDow), hour, minute },
          });
          allIds.push(id);
        }
        continue;
      }

      // Cada X días/semanas con intervalo 1 equivale a un trigger repetido.
      if (frequency === 'interval-days' && intervalValue === 1) {
        const id = await Notifications.scheduleNotificationAsync({
          content: notifContent,
          trigger: { type: 'daily' as any, hour, minute },
        });
        allIds.push(id);
        continue;
      }

      if (frequency === 'interval-weeks' && intervalValue === 1) {
        const anchor = habit.createdAt ? new Date(`${habit.createdAt}T12:00:00`) : new Date();
        const id = await Notifications.scheduleNotificationAsync({
          content: notifContent,
          trigger: { type: 'weekly' as any, weekday: toExpoWeekday(anchor.getDay()), hour, minute },
        });
        allIds.push(id);
        continue;
      }

      // Frecuencias que no tienen trigger nativo: se programan las próximas
      // ocurrencias y se renuevan cada vez que se abre la app.
      const dates = nextIntervalDates(
        frequency,
        intervalValue,
        hour,
        minute,
        habit.createdAt,
        FINITE_SCHEDULE_COUNT
      );
      for (const triggerDate of dates) {
        const id = await Notifications.scheduleNotificationAsync({
          content: notifContent,
          trigger: { type: 'date' as any, date: triggerDate },
        });
        allIds.push(id);
      }
    } catch (e) {
      console.warn('Notificación no disponible en este entorno:', (e as Error).message);
    }
  }

  return { primary: allIds[0] || null, others: allIds.slice(1) };
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
