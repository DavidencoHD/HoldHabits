import AsyncStorage from '@react-native-async-storage/async-storage';
import { Habit, Entry } from '../types';

const STORAGE_KEY = 'holdhabits_v1';
const OLD_STORAGE_KEY = 'pilltracker_v1';
const ONBOARDING_KEY = 'holdhabits_onboarding_done';
const OLD_ONBOARDING_KEY = 'trackify_onboarding_done';
const THEME_KEY = 'holdhabits_theme';
const SCHEMA_VERSION = 2;

function deriveCreatedAt(habit: Habit, entries: Entry[]): string {
  const fromId = Number(habit.id);
  if (habit.id && /^\d{12,}$/.test(habit.id) && Number.isFinite(fromId)) {
    return dateStr(new Date(fromId));
  }
  const own = entries
    .filter(e => e.habitId === habit.id && e.date)
    .map(e => e.date)
    .sort();
  if (own.length > 0) return own[0];
  return '';
}

function migrateHabits(habits: Habit[], entries: Entry[]): Habit[] {
  return habits.map(h => ({
    ...h,
    archived: h.archived === true,
    createdAt: typeof h.createdAt === 'string' ? h.createdAt : deriveCreatedAt(h, entries),
    reminderDays: Array.isArray(h.reminderDays) ? h.reminderDays : [],
    category: h.category || '',
    color: h.color || '#4F8EF7',
    emoji: h.emoji || '✅',
    dose: h.dose || '',
    reminderEnabled: h.reminderEnabled !== false,
    reminderFrequency: h.reminderFrequency || 'daily',
    reminderInterval: h.reminderInterval || 1,
    reminderTimes: (h as any).reminderTimes || ((h as any).reminderTime ? [(h as any).reminderTime] : [{ hour: 9, minute: 0 }]),
    notificationId: h.notificationId || null,
    notificationIds: h.notificationIds || [],
  }));
}

export async function loadData(): Promise<{ habits: Habit[]; entries: Entry[]; schemaVersion: number }> {
  try {
    let raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      raw = await AsyncStorage.getItem(OLD_STORAGE_KEY);
      if (raw) {
        await AsyncStorage.setItem(STORAGE_KEY, raw);
        await AsyncStorage.removeItem(OLD_STORAGE_KEY);
      }
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      const entries: Entry[] = parsed.entries || [];
      return {
        habits: migrateHabits(parsed.habits || [], entries),
        entries,
        schemaVersion: SCHEMA_VERSION,
      };
    }
  } catch (e) {
    console.warn('Error loading data:', e);
  }
  return { habits: [], entries: [], schemaVersion: SCHEMA_VERSION };
}

export async function saveData(habits: Habit[], entries: Entry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ habits, entries }));
  } catch (e) {
    console.warn('Error saving data:', e);
  }
}

export async function isOnboardingDone(): Promise<boolean> {
  try {
    let val = await AsyncStorage.getItem(ONBOARDING_KEY);
    if (val === null) {
      val = await AsyncStorage.getItem(OLD_ONBOARDING_KEY);
      if (val !== null) {
        await AsyncStorage.setItem(ONBOARDING_KEY, val);
        await AsyncStorage.removeItem(OLD_ONBOARDING_KEY);
      }
    }
    return val === 'true';
  } catch (e) {
    return false;
  }
}

export async function loadThemePreference(): Promise<string> {
  try {
    const val = await AsyncStorage.getItem(THEME_KEY);
    if (val === 'light' || val === 'dark') return val;
  } catch (e) {}
  return 'system';
}

export async function saveThemePreference(mode: string): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_KEY, mode);
  } catch (e) {}
}

export async function setOnboardingDone(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  } catch (e) {}
}

export async function exportAllData(): Promise<string> {
  const data = await loadData();
  return JSON.stringify(data, null, 2);
}

export async function importAllData(jsonStr: string): Promise<{ habits: Habit[]; entries: Entry[] }> {
  try {
    const data = JSON.parse(jsonStr);
    if (!data.habits || !data.entries) throw new Error('Formato inválido');
    await AsyncStorage.setItem(STORAGE_KEY, jsonStr);
    return data;
  } catch (e) {
    throw new Error('Error al importar: ' + (e as Error).message);
  }
}

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function formatTimeStr(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function currentTimeStr(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function isHabitScheduledOnDate(habit: Habit, dateStr: string): boolean {
  if (habit.reminderFrequency === 'daily') {
    const days = habit.reminderDays || [];
    if (days.length === 0) return true;
    const d = new Date(dateStr + 'T12:00:00');
    const dow = d.getDay();
    const normalized = dow === 0 ? 6 : dow - 1;
    return days.includes(normalized);
  }
  return true;
}

/**
 * Un hábito solo cuenta como esperado a partir del día en que se creó.
 * Los días anteriores no deben mostrarse como incumplidos.
 */
export function isHabitExpectedOnDate(habit: Habit, dateStr: string): boolean {
  if (habit.createdAt && dateStr < habit.createdAt) return false;
  return isHabitScheduledOnDate(habit, dateStr);
}

/**
 * Hábitos que cuentan para un día: los esperados según su programación y fecha
 * de creación, más los que tengan un registro manual en ese día (permite marcar
 * días anteriores a la creación del hábito).
 */
export function habitsForDate(habits: Habit[], entries: Entry[], dateStr: string): Habit[] {
  return habits.filter(h =>
    isHabitExpectedOnDate(h, dateStr) ||
    entries.some(e => e.date === dateStr && e.habitId === h.id)
  );
}

export function calcStreak(habits: Habit[], entries: Entry[]): number {
  if (!habits.length) return 0;
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = dateStr(d);
    const expected = habits.filter(h => isHabitExpectedOnDate(h, ds));
    if (expected.length === 0) continue;
    const allTaken = expected.every(h =>
      entries.some(e => e.date === ds && e.habitId === h.id)
    );
    if (allTaken) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

export function calcBestStreak(habits: Habit[], entries: Entry[]): number {
  if (!habits.length || !entries.length) return 0;
  const allDates = [...new Set(entries.map(e => e.date))].sort();
  let best = 0, cur = 0;
  let prev: string | null = null;
  for (const ds of allDates) {
    const expected = habits.filter(h => isHabitExpectedOnDate(h, ds));
    if (expected.length === 0) continue;
    const allTaken = expected.every(h =>
      entries.some(e => e.date === ds && e.habitId === h.id)
    );
    if (allTaken) {
      if (prev) {
        const diff = (new Date(ds).getTime() - new Date(prev).getTime()) / 86400000;
        cur = diff === 1 ? cur + 1 : 1;
      } else {
        cur = 1;
      }
      if (cur > best) best = cur;
      prev = ds;
    } else {
      prev = null;
    }
  }
  return best;
}

export function getMonthStats(habits: Habit[], entries: Entry[], year: number, month: number): { taken: number; missed: number; daysInMonth: number } {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  let taken = 0, missed = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dd = new Date(year, month, d);
    if (dd > today) break;
    const ds = dateStr(dd);
    const expected = habits.filter(h => isHabitExpectedOnDate(h, ds));
    if (expected.length === 0) continue;
    const allTaken = expected.every(h => entries.some(e => e.date === ds && e.habitId === h.id));
    if (allTaken) {
      taken++;
    } else {
      missed++;
    }
  }
  return { taken, missed, daysInMonth };
}
