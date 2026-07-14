import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, ReactNode } from 'react';
import * as Notifications from 'expo-notifications';
import { useColorScheme } from 'react-native';
import { loadData, saveData, todayStr, currentTimeStr, exportAllData, importAllData, loadThemePreference, saveThemePreference } from '../utils/storage';
import { scheduleHabitNotification, cancelHabitNotification, requestPermissions, setupNotificationCategories, ACTION_MARK_DONE } from '../utils/notifications';
import { Habit, Entry, HabitFormData } from '../types';

export interface AppContextValue {
  habits: Habit[];
  entries: Entry[];
  loading: boolean;
  notifGranted: boolean;
  themeMode: string;
  setThemeMode: (mode: 'system' | 'light' | 'dark') => void;
  resolvedScheme: 'light' | 'dark';
  enableNotifications: () => Promise<boolean>;
  markTaken: (habitId: string, date?: string, time?: string, note?: string) => Promise<Entry>;
  unmarkTaken: (habitId: string, date: string) => Promise<void>;
  isHabitTaken: (habitId: string, date?: string) => boolean;
  getEntryForHabit: (habitId: string, date?: string) => Entry | null;
  addHabit: (habit: HabitFormData) => Promise<Habit>;
  updateHabit: (id: string, updates: Partial<Habit>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  addEntry: (habitId: string, date: string, time: string, note: string) => Promise<void>;
  reorderHabits: (newHabits: Habit[]) => void;
  archiveHabit: (id: string) => Promise<void>;
  restoreHabit: (id: string) => Promise<void>;
  handleExport: () => Promise<string>;
  handleImport: (jsonStr: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifGranted, setNotifGranted] = useState(false);
  const [themeMode, setThemeModeState] = useState<string>('system');
  const systemScheme = useColorScheme();
  const resolvedScheme = themeMode === 'system' ? (systemScheme || 'dark') : themeMode as 'light' | 'dark';
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const habitsRef = useRef(habits);
  habitsRef.current = habits;

  const setThemeMode = useCallback((mode: 'system' | 'light' | 'dark') => {
    setThemeModeState(mode);
    saveThemePreference(mode);
  }, []);

  const persist = useCallback(async (newHabits, newEntries) => {
    await saveData(newHabits, newEntries);
  }, []);

  useEffect(() => {
    (async () => {
      const data = await loadData();
      setHabits(data.habits);
      setEntries(data.entries);
      const theme = await loadThemePreference();
      setThemeModeState(theme);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (loading) return;
    setupNotificationCategories();
    requestPermissions().then(setNotifGranted);
  }, [loading]);

  const handleMarkDone = useCallback(async (habitId) => {
    const date = todayStr();
    const time = currentTimeStr();
    const exists = entriesRef.current.some(e => e.date === date && e.habitId === habitId);
    if (!exists) {
      const newEntry = {
        id: Date.now().toString(),
        habitId,
        date,
        time,
        note: '',
        ts: Date.now(),
      };
      setEntries(prev => {
        const newEntries = [...prev, newEntry];
        persist(habitsRef.current, newEntries);
        return newEntries;
      });
    }
  }, [persist]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const { actionIdentifier, notification } = response;
      const habitId = notification.request.content.data?.habitId;
      if (!habitId) return;
      if (actionIdentifier === ACTION_MARK_DONE) {
        await handleMarkDone(habitId);
        try {
          await Notifications.dismissNotificationAsync(notification.request.identifier);
        } catch (e) {}
      }
    });
    return () => sub.remove();
  }, [handleMarkDone]);

  useEffect(() => {
    if (loading) return;
    (async () => {
      const response = await Notifications.getLastNotificationResponse();
      if (response) {
        const { actionIdentifier, notification } = response;
        const habitId = notification.request.content.data?.habitId;
        if (habitId && actionIdentifier === ACTION_MARK_DONE) {
          await handleMarkDone(habitId);
          try {
            await Notifications.dismissNotificationAsync(notification.request.identifier);
          } catch (e) {}
        }
      }
    })();
  }, [loading, handleMarkDone]);

  const markTaken = useCallback(async (habitId, date, time, note = '') => {
    const newEntry = {
      id: Date.now().toString(),
      habitId,
      date: date || todayStr(),
      time: time || currentTimeStr(),
      note,
      ts: Date.now(),
    };
    setEntries(prev => {
      const newEntries = [...prev, newEntry] as Entry[];
      persist(habits, newEntries);
      return newEntries;
    });
    return newEntry;
  }, [habits, persist]);

  const unmarkTaken = useCallback(async (habitId, date) => {
    setEntries(prev => {
      const newEntries = prev.filter(
        e => !(e.date === date && e.habitId === habitId)
      );
      persist(habits, newEntries);
      return newEntries;
    });
  }, [habits, persist]);

  const isHabitTaken = useCallback((habitId, date) => {
    const d = date || todayStr();
    return entries.some(e => e.date === d && e.habitId === habitId);
  }, [entries]);

  const getEntryForHabit = useCallback((habitId, date) => {
    const d = date || todayStr();
    return entries.find(e => e.date === d && e.habitId === habitId) || null;
  }, [entries]);

  const addHabit = useCallback(async (habit) => {
    const newHabit = {
      id: Date.now().toString(),
      name: habit.name,
      dose: habit.dose || '',
      emoji: habit.emoji || '✅',
      color: habit.color || '#4F8EF7',
      category: habit.category || '',
      archived: false,
      reminderDays: habit.reminderDays || [],
      reminderTimes: habit.reminderTimes?.length ? habit.reminderTimes : [{ hour: 9, minute: 0 }],
      reminderEnabled: habit.reminderEnabled !== false,
      reminderFrequency: habit.reminderFrequency || 'daily',
      reminderInterval: habit.reminderInterval || 1,
      notificationId: null,
      notificationIds: [],
    };

    let finalHabit = newHabit;
    if (newHabit.reminderEnabled && notifGranted) {
      try {
        const result = await scheduleHabitNotification(newHabit);
        finalHabit = {
          ...newHabit,
          notificationId: result.primary,
          notificationIds: result.others || [],
        };
      } catch (e) {
        console.warn('Error al programar notificación:', e.message);
      }
    }

    setHabits(prev => {
      const newHabits = [...prev, finalHabit];
      persist(newHabits, entries);
      return newHabits;
    });
    return finalHabit;
  }, [entries, notifGranted, persist]);

  const updateHabit = useCallback(async (id, updates) => {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;

    const updated = { ...habit, ...updates };

    if (notifGranted) {
      if (habit.notificationIds && habit.notificationIds.length > 0) {
        for (const nid of habit.notificationIds) {
          await cancelHabitNotification(nid);
        }
      }
      if (habit.notificationId) {
        await cancelHabitNotification(habit.notificationId);
      }
      if (updated.reminderEnabled) {
        try {
          const result = await scheduleHabitNotification(updated);
          updated.notificationId = result.primary;
          updated.notificationIds = result.others || [];
        } catch (e) {
          console.warn('Error al reprogramar notificación:', e.message);
        }
      } else {
        updated.notificationId = null;
        updated.notificationIds = [];
      }
    }

    setHabits(prev => {
      const newHabits = prev.map(h => h.id === id ? updated : h);
      persist(newHabits, entries);
      return newHabits;
    });
  }, [habits, entries, notifGranted, persist]);

  const deleteHabit = useCallback(async (id) => {
    const habit = habits.find(h => h.id === id);
    if (habit?.notificationIds && habit.notificationIds.length > 0) {
      for (const nid of habit.notificationIds) {
        await cancelHabitNotification(nid);
      }
    }
    if (habit?.notificationId) {
      await cancelHabitNotification(habit.notificationId);
    }
    setHabits(prev => {
      const newHabits = prev.filter(h => h.id !== id);
      const newEntries = entries.filter(e => e.habitId !== id);
      persist(newHabits, newEntries);
      return newHabits;
    });
    setEntries(prev => prev.filter(e => e.habitId !== id));
  }, [habits, entries, persist]);

  const addEntry = useCallback(async (habitId, date, time, note) => {
    const exists = entries.some(e => e.date === date && e.habitId === habitId);
    if (exists) {
      setEntries(prev => {
        const newEntries = prev.map(e =>
          e.date === date && e.habitId === habitId
            ? { ...e, time, note }
            : e
        );
        persist(habits, newEntries);
        return newEntries;
      });
    } else {
      await markTaken(habitId, date, time, note);
    }
  }, [habits, entries, markTaken, persist]);

  const reorderHabits = useCallback((newHabits) => {
    setHabits(newHabits);
    persist(newHabits, entries);
  }, [entries, persist]);

  const archiveHabit = useCallback(async (id) => {
    setHabits(prev => {
      const newHabits = prev.map(h => h.id === id ? { ...h, archived: true } : h);
      persist(newHabits, entries);
      return newHabits;
    });
  }, [entries, persist]);

  const restoreHabit = useCallback(async (id) => {
    setHabits(prev => {
      const newHabits = prev.map(h => h.id === id ? { ...h, archived: false } : h);
      persist(newHabits, entries);
      return newHabits;
    });
  }, [entries, persist]);

  const handleExport = useCallback(async () => {
    return await exportAllData();
  }, []);

  const handleImport = useCallback(async (jsonStr) => {
    const data = await importAllData(jsonStr);
    setHabits(data.habits);
    setEntries(data.entries);
  }, []);

  return (
    <AppContext.Provider value={{
      habits,
      entries,
      loading,
      notifGranted,
      themeMode,
      setThemeMode,
      resolvedScheme,
      enableNotifications: useCallback(async () => {
        const granted = await requestPermissions();
        setNotifGranted(granted);
        if (granted) {
          const updated = await Promise.all(
            habits.map(async (h) => {
              if (h.reminderEnabled) {
                try {
                  const result = await scheduleHabitNotification(h);
                  return { ...h, notificationId: result.primary, notificationIds: result.others || [] };
                } catch (e) {
                  console.warn('Error al reprogramar:', e.message);
                  return h;
                }
              }
              return h;
            })
          );
          setHabits(updated);
          await persist(updated, entries);
        }
        return granted;
      }, [habits, entries, persist]),
      markTaken,
      unmarkTaken,
      isHabitTaken,
      getEntryForHabit,
      addHabit,
      updateHabit,
      deleteHabit,
      addEntry,
      reorderHabits,
      archiveHabit,
      restoreHabit,
      handleExport,
      handleImport,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
