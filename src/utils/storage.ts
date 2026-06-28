import AsyncStorage from '@react-native-async-storage/async-storage';
import { Habit, Entry } from '../types';

const STORAGE_KEY = 'pilltracker_v1';
const ONBOARDING_KEY = 'trackify_onboarding_done';
const SCHEMA_VERSION = 2;

function migrateHabits(habits: Habit[]): Habit[] {
  return habits.map(h => ({
    ...h,
    archived: h.archived === true,
    reminderDays: Array.isArray(h.reminderDays) ? h.reminderDays : [],
    category: h.category || '',
    color: h.color || '#4F8EF7',
    emoji: h.emoji || '✅',
    dose: h.dose || '',
    reminderEnabled: h.reminderEnabled !== false,
    reminderFrequency: h.reminderFrequency || 'daily',
    reminderInterval: h.reminderInterval || 1,
    reminderTime: h.reminderTime || { hour: 9, minute: 0 },
    notificationId: h.notificationId || null,
    notificationIds: h.notificationIds || [],
  }));
}

export async function loadData(): Promise<{ habits: Habit[]; entries: Entry[]; schemaVersion: number }> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        habits: migrateHabits(parsed.habits || []),
        entries: parsed.entries || [],
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
    const val = await AsyncStorage.getItem(ONBOARDING_KEY);
    return val === 'true';
  } catch (e) {
    return false;
  }
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

export function calcStreak(habits: Habit[], entries: Entry[]): number {
  if (!habits.length) return 0;
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = dateStr(d);
    const allTaken = habits.every(h =>
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
    const allTaken = habits.every(h =>
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
    const allTaken =
      habits.length > 0 &&
      habits.every(h => entries.some(e => e.date === ds && e.habitId === h.id));
    const isToday = ds === dateStr(today);
    if (allTaken) {
      taken++;
    } else if (!isToday && habits.length > 0) {
      missed++;
    }
  }
  return { taken, missed, daysInMonth };
}
