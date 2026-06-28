export interface ReminderTime {
  hour: number;
  minute: number;
}

export interface Habit {
  id: string;
  name: string;
  dose: string;
  emoji: string;
  color: string;
  category: string;
  archived: boolean;
  reminderDays: number[];
  reminderTime: ReminderTime;
  reminderEnabled: boolean;
  reminderFrequency: string;
  reminderInterval: number;
  notificationId: string | null;
  notificationIds: string[];
}

export interface Entry {
  id: string;
  habitId: string;
  date: string;
  time: string;
  note: string;
  ts: number;
}

export interface HabitFormData {
  name: string;
  dose: string;
  emoji: string;
  color: string;
  category: string;
  reminderEnabled: boolean;
  reminderTime: ReminderTime;
  reminderFrequency: string;
  reminderInterval: number;
  reminderDays: number[];
}

export interface AppData {
  habits: Habit[];
  entries: Entry[];
  schemaVersion: number;
}

export type ThemeColors = {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  success: string;
  successLight: string;
  successBorder: string;
  danger: string;
  dangerLight: string;
  dangerBorder: string;
  warning: string;
  warningLight: string;
  surface: string;
  surface1: string;
  surface2: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  white: string;
};

export type Category = {
  key: string;
  label: string;
  icon: string;
};
