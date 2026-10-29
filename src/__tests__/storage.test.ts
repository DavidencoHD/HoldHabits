import AsyncStorage from '@react-native-async-storage/async-storage';
import { Habit, Entry } from '../types';
import { calcStreak, calcBestStreak, getMonthStats, dateStr, isHabitExpectedOnDate, habitsForDate, loadData } from '../utils/storage';

const makeHabit = (id: string, extra: Partial<Habit> = {}): Habit => ({
  id,
  name: `Habit ${id}`,
  dose: '',
  emoji: '✅',
  color: '#4F8EF7',
  category: '',
  archived: false,
  createdAt: '',
  reminderDays: [],
  reminderTimes: [{ hour: 9, minute: 0 }],
  reminderEnabled: true,
  reminderFrequency: 'daily',
  reminderInterval: 1,
  notificationId: null,
  notificationIds: [],
  ...extra,
});

const makeEntry = (habitId: string, date: string): Entry => ({
  id: `${habitId}-${date}`, habitId, date, time: '09:00', note: '', ts: 0,
});

describe('isHabitExpectedOnDate', () => {
  it('no cuenta los días anteriores a la creación del hábito', () => {
    const habit = makeHabit('1', { createdAt: '2026-10-22' });
    expect(isHabitExpectedOnDate(habit, '2026-10-21')).toBe(false);
    expect(isHabitExpectedOnDate(habit, '2026-10-22')).toBe(true);
    expect(isHabitExpectedOnDate(habit, '2026-10-25')).toBe(true);
  });

  it('sigue respetando los días programados', () => {
    const habit = makeHabit('1', { createdAt: '2026-10-01', reminderDays: [0, 2] });
    expect(isHabitExpectedOnDate(habit, '2026-10-05')).toBe(true);  // lunes
    expect(isHabitExpectedOnDate(habit, '2026-10-06')).toBe(false); // martes
    expect(isHabitExpectedOnDate(habit, '2026-10-07')).toBe(true);  // miércoles
  });
});

describe('habitsForDate', () => {
  it('excluye un hábito antes de su creación si no tiene registro', () => {
    const habit = makeHabit('1', { createdAt: '2026-10-22' });
    expect(habitsForDate([habit], [], '2026-10-20')).toEqual([]);
  });

  it('incluye el hábito si se registró manualmente un día anterior', () => {
    const habit = makeHabit('1', { createdAt: '2026-10-22' });
    const entries = [makeEntry('1', '2026-10-20')];
    expect(habitsForDate([habit], entries, '2026-10-20')).toEqual([habit]);
  });
});

describe('loadData', () => {
  it('deduce la fecha de creación del id de los hábitos ya existentes', async () => {
    const createdMs = new Date('2026-10-22T10:00:00').getTime();
    await AsyncStorage.setItem('holdhabits_v1', JSON.stringify({
      habits: [{ id: String(createdMs), name: 'Estiramientos', archived: false }],
      entries: [],
    }));
    const data = await loadData();
    expect(data.habits[0].createdAt).toBe('2026-10-22');
  });

  it('usa el primer registro si el id no contiene una fecha', async () => {
    await AsyncStorage.setItem('holdhabits_v1', JSON.stringify({
      habits: [{ id: 'antiguo', name: 'X', archived: false }],
      entries: [makeEntry('antiguo', '2026-09-01')],
    }));
    const data = await loadData();
    expect(data.habits[0].createdAt).toBe('2026-09-01');
  });
});

describe('calcStreak', () => {
  it('returns 0 when no habits', () => {
    expect(calcStreak([], [])).toBe(0);
  });

  it('counts consecutive days', () => {
    const habits = [makeHabit('1')];
    const today = new Date();
    const entries = [0, 1, 2, 3].map(i => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return makeEntry('1', dateStr(d));
    });
    expect(calcStreak(habits, entries)).toBe(4);
  });

  it('breaks streak on missing day', () => {
    const habits = [makeHabit('1')];
    const today = new Date();
    const entries = [0, 2].map(i => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return makeEntry('1', dateStr(d));
    });
    expect(calcStreak(habits, entries)).toBe(1);
  });

  it('counts today as part of streak', () => {
    const habits = [makeHabit('1')];
    const today = new Date();
    const entries = [0].map(i => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return makeEntry('1', dateStr(d));
    });
    expect(calcStreak(habits, entries)).toBe(1);
  });

  it('no rompe la racha por días anteriores a la creación', () => {
    const today = new Date();
    const created = new Date(today);
    created.setDate(created.getDate() - 1);
    const habits = [makeHabit('1', { createdAt: dateStr(created) })];
    const entries = [0, 1].map(i => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return makeEntry('1', dateStr(d));
    });
    expect(calcStreak(habits, entries)).toBe(2);
  });
});

describe('calcBestStreak', () => {
  it('returns 0 when no entries', () => {
    expect(calcBestStreak([makeHabit('1')], [])).toBe(0);
  });

  it('finds best streak across gaps', () => {
    const habits = [makeHabit('1')];
    const today = new Date();
    const entries = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      entries.push(makeEntry('1', dateStr(d)));
    }
    const gap = new Date(today);
    gap.setDate(gap.getDate() - 10);
    entries.push(makeEntry('1', dateStr(gap)));
    entries.push(makeEntry('1', dateStr(new Date(gap.getTime() - 86400000))));
    expect(calcBestStreak(habits, entries)).toBe(5);
  });
});

describe('getMonthStats', () => {
  it('returns zeros for empty habits', () => {
    const stats = getMonthStats([], [], 2026, 5);
    expect(stats).toEqual({ taken: 0, missed: 0, daysInMonth: 30 });
  });
});
