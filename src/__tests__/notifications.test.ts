jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationCategoryAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(async () => 'notif-id'),
  cancelScheduledNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  AndroidImportance: { MAX: 5 },
}));

jest.mock('expo-device', () => ({ isDevice: true }));

import * as Notifications from 'expo-notifications';
import { Habit } from '../types';
import { nextIntervalDates, needsScheduleRefresh, scheduleHabitNotification } from '../utils/notifications';

const makeHabit = (extra: Partial<Habit> = {}): Habit => ({
  id: 'h1',
  name: 'Estiramientos',
  dose: '',
  emoji: '🤸',
  color: '#4F8EF7',
  category: '',
  archived: false,
  createdAt: '2026-10-22',
  reminderDays: [],
  reminderTimes: [{ hour: 14, minute: 0 }],
  reminderEnabled: true,
  reminderFrequency: 'daily',
  reminderInterval: 1,
  notificationId: null,
  notificationIds: [],
  ...extra,
});

const scheduleMock = Notifications.scheduleNotificationAsync as jest.Mock;

beforeEach(() => {
  scheduleMock.mockClear();
});

describe('nextIntervalDates', () => {
  it('empieza en la primera ocurrencia futura', () => {
    const now = new Date('2026-10-22T15:00:00');
    const dates = nextIntervalDates('interval-days', 3, 14, 0, '2026-10-22', 3, now);
    expect(dates.map(d => d.toISOString().slice(0, 10))).toEqual([
      '2026-10-25',
      '2026-10-28',
      '2026-10-31',
    ]);
    expect(dates[0].getHours()).toBe(14);
    expect(dates[0].getMinutes()).toBe(0);
  });

  it('mantiene el ancla original aunque la app no se abra', () => {
    const now = new Date('2026-10-30T09:00:00');
    const dates = nextIntervalDates('interval-days', 3, 14, 0, '2026-10-22', 2, now);
    expect(dates.map(d => d.toISOString().slice(0, 10))).toEqual(['2026-10-31', '2026-11-03']);
  });

  it('calcula semanas', () => {
    const now = new Date('2026-10-22T15:00:00');
    const dates = nextIntervalDates('interval-weeks', 2, 14, 0, '2026-10-22', 2, now);
    expect(dates.map(d => d.toISOString().slice(0, 10))).toEqual(['2026-11-05', '2026-11-19']);
  });

  it('no se sale de los meses cortos', () => {
    const now = new Date('2026-01-31T15:00:00');
    const dates = nextIntervalDates('interval-months', 1, 14, 0, '2026-01-31', 2, now);
    expect(dates.map(d => d.toISOString().slice(0, 10))).toEqual(['2026-02-28', '2026-03-31']);
  });
});

describe('needsScheduleRefresh', () => {
  it('las frecuencias repetidas nativas no se reprograman', () => {
    expect(needsScheduleRefresh(makeHabit({ reminderFrequency: 'daily' }))).toBe(false);
    expect(needsScheduleRefresh(makeHabit({ reminderFrequency: 'interval-days', reminderInterval: 1 }))).toBe(false);
    expect(needsScheduleRefresh(makeHabit({ reminderFrequency: 'interval-weeks', reminderInterval: 1 }))).toBe(false);
  });

  it('las frecuencias con fechas finitas sí', () => {
    expect(needsScheduleRefresh(makeHabit({ reminderFrequency: 'interval-days', reminderInterval: 2 }))).toBe(true);
    expect(needsScheduleRefresh(makeHabit({ reminderFrequency: 'interval-weeks', reminderInterval: 3 }))).toBe(true);
    expect(needsScheduleRefresh(makeHabit({ reminderFrequency: 'interval-months', reminderInterval: 1 }))).toBe(true);
  });
});

describe('scheduleHabitNotification', () => {
  it('usa un único trigger diario para todos los días', async () => {
    await scheduleHabitNotification(makeHabit());
    expect(scheduleMock).toHaveBeenCalledTimes(1);
    expect(scheduleMock.mock.calls[0][0].trigger).toEqual({ type: 'daily', hour: 14, minute: 0 });
  });

  it('usa triggers semanales (máximo 7) en vez de 60 fechas fijas', async () => {
    // reminderDays: 0=lunes … 6=domingo → expo: 1=domingo … 7=sábado
    await scheduleHabitNotification(makeHabit({ reminderDays: [0, 2] }));
    expect(scheduleMock).toHaveBeenCalledTimes(2);
    expect(scheduleMock.mock.calls.map(c => c[0].trigger)).toEqual([
      { type: 'weekly', weekday: 2, hour: 14, minute: 0 }, // lunes
      { type: 'weekly', weekday: 4, hour: 14, minute: 0 }, // miércoles
    ]);
  });

  it('un hábito de cada 2 días programa fechas finitas desde su creación', async () => {
    await scheduleHabitNotification(
      makeHabit({ reminderFrequency: 'interval-days', reminderInterval: 2 })
    );
    expect(scheduleMock.mock.calls.every(c => c[0].trigger.type === 'date')).toBe(true);
    expect(scheduleMock.mock.calls.length).toBe(12);
  });

  it('no programa nada si los recordatorios están desactivados', async () => {
    await scheduleHabitNotification(makeHabit({ reminderEnabled: false }));
    expect(scheduleMock).not.toHaveBeenCalled();
  });
});
