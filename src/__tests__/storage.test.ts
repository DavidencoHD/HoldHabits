import { calcStreak, calcBestStreak, getMonthStats, dateStr } from '../utils/storage';

const makeHabit = (id) => ({ id, name: `Habit ${id}`, archived: false });
const makeEntry = (habitId, date) => ({ id: `${habitId}-${date}`, habitId, date, time: '09:00', note: '' });

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
