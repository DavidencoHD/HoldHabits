import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, RefreshControl, Modal, Animated, Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../utils/AppContext';
import { colors, darkColors, spacing, radius, fontSize } from '../utils/theme';
import { todayStr, dateStr, calcStreak, getMonthStats } from '../utils/storage';

const CATEGORIES = [
  { key: '', label: 'Sin categoría', icon: 'ellipse-outline' },
  { key: 'salud', label: 'Salud', icon: 'fitness-outline' },
  { key: 'ejercicio', label: 'Ejercicio', icon: 'barbell-outline' },
  { key: 'estudio', label: 'Estudio', icon: 'book-outline' },
  { key: 'trabajo', label: 'Trabajo', icon: 'briefcase-outline' },
  { key: 'hogar', label: 'Hogar', icon: 'home-outline' },
  { key: 'ocio', label: 'Ocio', icon: 'game-controller-outline' },
  { key: 'social', label: 'Social', icon: 'people-outline' },
];

function catLabel(key) {
  return CATEGORIES.find(c => c.key === key)?.label || 'Sin categoría';
}

function catIcon(key) {
  return CATEGORIES.find(c => c.key === key)?.icon || 'ellipse-outline';
}

function formatDate(date) {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${days[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]}`;
}

function shortDayLabel(ds, todayStr) {
  if (ds === todayStr) return 'Hoy';
  const d = new Date(ds + 'T12:00:00');
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yStr = dateStr(yesterday);
  if (ds === yStr) return 'Ayer';
  const dias = ['D','L','M','X','J','V','S'];
  return dias[d.getDay()];
}

function dayNumber(ds) {
  return new Date(ds + 'T12:00:00').getDate();
}

function AnimatedCheckmark({ size = 26, color }) {
  const scale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 4 }).start();
  }, []);
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Ionicons name="checkmark-circle" size={size} color={color} />
    </Animated.View>
  );
}

function HabitCard({ habit, taken, entry, onToggle, c, s }) {
  const animScale = useRef(new Animated.Value(1)).current;
  const pressIn = () => Animated.spring(animScale, { toValue: 0.95, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(animScale, { toValue: 1, useNativeDriver: true, friction: 3 }).start();
  return (
    <Animated.View style={{ transform: [{ scale: animScale }] }}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onToggle}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={[s.habitCard, taken && s.habitCardDone]}
      >
        <View style={[s.habitIcon, { backgroundColor: taken ? c.successLight : (habit.color + '20') }]}>
          {taken
            ? <AnimatedCheckmark size={26} color={c.success} />
            : <Text style={{ fontSize: 24 }}>{habit.emoji}</Text>
          }
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Text style={[s.habitName, taken && { color: c.success, fontWeight: '600' }]}>
              {habit.name}
            </Text>
            {habit.category ? (
              <Ionicons name={catIcon(habit.category)} size={12} color={c.textMuted} />
            ) : null}
          </View>
          <Text style={s.habitSub}>
            {taken
              ? (entry?.note || `Completado a las ${entry?.time || ''}`)
              : (habit.dose || 'Pendiente')
            }
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {taken ? (
            <View style={s.takenBadge}>
              <Ionicons name="checkmark" size={12} color={c.success} />
              <Text style={s.takenBadgeText}>Hecho</Text>
            </View>
          ) : (
            <Text style={s.reminderTime}>
              <Ionicons name="time-outline" size={12} color={c.textMuted} /> {(habit.reminderTimes || []).map(t => `${String(t.hour).padStart(2,'0')}:${String(t.minute).padStart(2,'0')}`).join(', ')}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const dayStripRef = useRef(null);

  const {
    habits, entries, notifGranted, resolvedScheme,
    markTaken, unmarkTaken, isHabitTaken, getEntryForHabit,
    enableNotifications, themeMode, setThemeMode,
  } = useApp();
  const c = resolvedScheme === 'dark' ? darkColors : colors;

  const [refreshing, setRefreshing] = useState(false);
  const [confirmUnmark, setConfirmUnmark] = useState(null);
  const [focusMode, setFocusMode] = useState(false);
  const today = todayStr();
  const [selectedDate, setSelectedDate] = useState(today);

  const visibleHabits = habits.filter(h => !h.archived);

  const streak = calcStreak(visibleHabits, entries);
  const totalHabits = visibleHabits.length;
  const doneCount = visibleHabits.filter(h => isHabitTaken(h.id, selectedDate)).length;
  const pct = totalHabits > 0 ? Math.round(doneCount / totalHabits * 100) : 0;

  const filteredHabits = focusMode
    ? visibleHabits.filter(h => !isHabitTaken(h.id, selectedDate))
    : visibleHabits;

  const grouped = {};
  filteredHabits.forEach(h => {
    const k = h.category || '';
    if (!grouped[k]) grouped[k] = [];
    grouped[k].push(h);
  });
  const sortedCats = Object.keys(grouped).sort((a, b) => {
    if (a === '' && b !== '') return 1;
    if (b === '' && a !== '') return -1;
    return a.localeCompare(b);
  });

  const days = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return dateStr(d);
    });
  }, []);

  const goToday = useCallback(() => {
    setSelectedDate(today);
    setFocusMode(false);
  }, [today]);

  useEffect(() => {
    dayStripRef.current?.scrollToEnd({ animated: false });
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const handleToggle = useCallback(async (habitId) => {
    const taken = isHabitTaken(habitId, selectedDate);
    if (taken) {
      setConfirmUnmark(habitId);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await markTaken(habitId, selectedDate);
    }
  }, [isHabitTaken, markTaken, selectedDate]);

  const handleConfirmUnmark = useCallback(() => {
    if (confirmUnmark) {
      unmarkTaken(confirmUnmark, selectedDate);
      setConfirmUnmark(null);
    }
  }, [confirmUnmark, unmarkTaken, selectedDate]);

  const confirmHabit = confirmUnmark ? habits.find(h => h.id === confirmUnmark) : null;

  const handleEnableNotif = useCallback(async () => {
    const granted = await enableNotifications();
    if (!granted) {
      Alert.alert(
        'Permisos necesarios',
        'Ve a Ajustes > Aplicaciones > HoldHabits > Notificaciones y actívalas.',
        [{ text: 'Entendido' }]
      );
    }
  }, [enableNotifications]);

  const allDone = visibleHabits.length > 0 && visibleHabits.every(h => isHabitTaken(h.id, today));
  const isToday = selectedDate === today;

  const s = makeStyles(c);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={s.header}>
          <View>
            <Text style={s.headerTitle}>
              {isToday ? 'Tus hábitos' : shortDayLabel(selectedDate, today)}
            </Text>
            <Text style={s.headerDate}>
              {isToday ? formatDate(new Date()) : formatDate(new Date(selectedDate + 'T12:00:00'))}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {!isToday && (
              <TouchableOpacity style={s.headerBtn} onPress={goToday}>
                <Ionicons name="today-outline" size={20} color={c.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={s.headerBtn}
              onPress={() => {
                const modes = ['system', 'light', 'dark'];
                const idx = modes.indexOf(themeMode);
                setThemeMode(modes[(idx + 1) % 3] as 'system' | 'light' | 'dark');
              }}
            >
              <Ionicons
                name={themeMode === 'light' ? 'sunny' : themeMode === 'dark' ? 'moon' : 'contrast'}
                size={20} color={c.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.headerBtn, focusMode && { backgroundColor: c.primary + '20', borderColor: c.primary }]}
              onPress={() => setFocusMode(v => !v)}
            >
              <Ionicons name={focusMode ? 'eye-off-outline' : 'eye-outline'} size={20} color={focusMode ? c.primary : c.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={s.headerBtn} onPress={() => navigation.navigate('Habits')}>
              <Ionicons name="settings-outline" size={20} color={c.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Day strip */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          ref={dayStripRef}
          style={{ marginBottom: spacing.md }}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}
        >
          {days.map(ds => {
            const allDone_ = visibleHabits.length > 0 && visibleHabits.every(h => isHabitTaken(h.id, ds));
            const someDone_ = visibleHabits.some(h => isHabitTaken(h.id, ds));
            const dotColor = allDone_ ? c.success : someDone_ ? c.warning : visibleHabits.length > 0 ? c.dangerLight : c.surface2;
            const isSel = ds === selectedDate;
            return (
              <TouchableOpacity
                key={ds}
                onPress={() => setSelectedDate(ds)}
                style={[s.dayChip, { backgroundColor: c.surface, borderColor: isSel ? c.primary : c.border, borderWidth: isSel ? 2 : 1 }]}
              >
                <Text style={{ fontSize: 10, fontWeight: '600', color: c.textMuted }}>{shortDayLabel(ds, today)}</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: c.textPrimary }}>{dayNumber(ds)}</Text>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dotColor }} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {!notifGranted && (
          <TouchableOpacity style={s.notifBanner} onPress={handleEnableNotif}>
            <Ionicons name="notifications-outline" size={20} color={c.primary} />
            <Text style={s.notifText}>Activa los recordatorios</Text>
            <Text style={s.notifCta}>Activar</Text>
          </TouchableOpacity>
        )}

        {totalHabits > 0 && (
          <View style={s.progressCard}>
            <View style={s.progressRing}>
              <View style={[s.progressRingBg, { borderColor: c.successLight }]}>
                <View style={[s.progressRingFill, {
                  width: 56, height: 56, borderRadius: 28, borderWidth: 4,
                  borderColor: pct === 100 ? c.success : c.primary,
                }]}>
                  <Text style={s.progressPct}>{pct}%</Text>
                </View>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.progressTitle}>
                {doneCount === totalHabits ? '¡Completado!' : 'Progreso'}
              </Text>
              <Text style={s.progressSub}>
                {doneCount} de {totalHabits} hábito{totalHabits > 1 ? 's' : ''} hecho{doneCount !== 1 ? 's' : ''}
              </Text>
              {streak > 0 && isToday && (
                <View style={s.streakMini}>
                  <Text>🔥</Text>
                  <Text style={s.streakMiniText}>{streak} días seguidos</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {visibleHabits.length === 0 ? (
          <TouchableOpacity style={s.emptyCard} onPress={() => navigation.navigate('Habits')}>
            <Ionicons name="add-circle-outline" size={48} color={c.textMuted} />
            <Text style={s.emptyTitle}>
              {habits.length > 0 ? 'Todos archivados' : 'Sin hábitos configurados'}
            </Text>
            <Text style={s.emptySubtitle}>Pulsa para gestionar hábitos</Text>
          </TouchableOpacity>
        ) : (
          sortedCats.map(catKey => (
            <View key={catKey} style={{ marginBottom: spacing.sm }}>
              <Text style={s.sectionTitle}>
                <Ionicons name={catIcon(catKey)} size={12} color={c.textMuted} /> {catLabel(catKey).toUpperCase()}
              </Text>
              <View style={s.habitsList}>
                {grouped[catKey].map(h => (
                  <HabitCard
                    key={h.id}
                    habit={h}
                    taken={isHabitTaken(h.id, selectedDate)}
                    entry={getEntryForHabit(h.id, selectedDate)}
                    onToggle={() => handleToggle(h.id)}
                    c={c}
                    s={s}
                  />
                ))}
              </View>
            </View>
          ))
        )}

        {focusMode && doneCount > 0 && doneCount < totalHabits && (
          <TouchableOpacity style={s.focusHint} onPress={() => setFocusMode(false)}>
            <Ionicons name="eye-outline" size={16} color={c.primary} />
            <Text style={s.focusHintText}>Mostrar completados ({doneCount})</Text>
          </TouchableOpacity>
        )}

        {visibleHabits.length > 0 && (
          <TouchableOpacity style={s.logBtn} onPress={() => navigation.navigate('Log')}>
            <Ionicons name="add-circle-outline" size={18} color={c.primary} />
            <Text style={s.logBtnText}>Registrar otro día</Text>
          </TouchableOpacity>
        )}

        {allDone && !focusMode && (
          <View style={s.allDoneCard}>
            <Text style={{ fontSize: 36 }}>🎉</Text>
            <Text style={s.allDoneTitle}>¡Todo completado!</Text>
            <Text style={s.allDoneSub}>Has hecho todos tus hábitos de hoy.</Text>
          </View>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      <Modal visible={confirmUnmark !== null} transparent animationType="fade">
        <TouchableOpacity
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}
          activeOpacity={1}
          onPress={() => setConfirmUnmark(null)}
        >
          <TouchableOpacity activeOpacity={1} style={{
            backgroundColor: c.surface, borderRadius: radius.lg,
            paddingVertical: spacing.xl, paddingHorizontal: spacing.xl,
            width: 300, alignItems: 'center', gap: spacing.md,
          }}>
            <View style={{
              width: 56, height: 56, borderRadius: 28,
              backgroundColor: c.dangerLight,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name="close-circle-outline" size={28} color={c.danger} />
            </View>
            <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: c.textPrimary }}>Desmarcar hábito</Text>
            {confirmHabit && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
                backgroundColor: c.surface1, borderRadius: radius.sm,
                paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
              }}>
                <Text style={{ fontSize: 20 }}>{confirmHabit.emoji}</Text>
                <Text style={{ fontSize: fontSize.md, color: c.textSecondary, fontWeight: '500' }}>{confirmHabit.name}</Text>
              </View>
            )}
            <Text style={{ fontSize: fontSize.sm, color: c.textMuted, textAlign: 'center' }}>
              Se eliminará el registro de {isToday ? 'hoy' : shortDayLabel(selectedDate, today)} de este hábito.
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
              <TouchableOpacity
                onPress={() => setConfirmUnmark(null)}
                style={{ flex: 1, paddingVertical: spacing.md, borderRadius: radius.sm, backgroundColor: c.surface1, borderWidth: 0.5, borderColor: c.border, alignItems: 'center' }}
              >
                <Text style={{ fontSize: fontSize.md, color: c.textSecondary, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmUnmark}
                style={{ flex: 1, paddingVertical: spacing.md, borderRadius: radius.sm, backgroundColor: c.danger, alignItems: 'center' }}
              >
                <Text style={{ fontSize: fontSize.md, color: '#fff', fontWeight: '600' }}>Desmarcar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.surface1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.lg,
  },
  headerTitle: { fontSize: fontSize.xxl, fontWeight: '700', color: c.textPrimary },
  headerDate: { fontSize: fontSize.sm, color: c.textMuted, marginTop: 2 },
  headerBtn: {
    width: 40, height: 40, borderRadius: radius.full,
    backgroundColor: c.surface, borderWidth: 0.5, borderColor: c.border,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 }, android: { elevation: 2 } }),
  },
  notifBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.lg, marginBottom: spacing.md,
    backgroundColor: c.primaryLight, borderWidth: 0.5, borderColor: c.primary + '40',
    borderRadius: radius.md, padding: spacing.md,
  },
  notifText: { flex: 1, fontSize: fontSize.sm, color: c.primary },
  notifCta: { fontSize: fontSize.sm, fontWeight: '600', color: c.primary },
  progressCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    marginHorizontal: spacing.lg, marginBottom: spacing.lg,
    backgroundColor: c.surface, borderWidth: 0.5, borderColor: c.border,
    borderRadius: radius.lg, padding: spacing.lg,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 }, android: { elevation: 3 } }),
  },
  progressRing: { alignItems: 'center', justifyContent: 'center' },
  progressRingBg: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 4, borderColor: c.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  progressRingFill: { alignItems: 'center', justifyContent: 'center' },
  progressPct: { fontSize: fontSize.md, fontWeight: '700', color: c.textPrimary },
  progressTitle: { fontSize: fontSize.md, fontWeight: '600', color: c.textPrimary },
  progressSub: { fontSize: fontSize.sm, color: c.textSecondary, marginTop: 1 },
  streakMini: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs },
  streakMiniText: { fontSize: fontSize.xs, color: c.textMuted },
  sectionTitle: {
    fontSize: fontSize.xs, fontWeight: '700', color: c.textMuted,
    letterSpacing: 0.8, paddingHorizontal: spacing.lg, marginBottom: spacing.sm,
  },
  dayChip: {
    width: 48, alignItems: 'center', gap: 2,
    paddingVertical: spacing.sm, borderRadius: radius.md,
  },
  habitsList: { marginHorizontal: spacing.lg },
  habitCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.lg, backgroundColor: c.surface,
    borderWidth: 0.5, borderColor: c.border, borderRadius: radius.lg, marginBottom: spacing.sm,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 }, android: { elevation: 2 } }),
  },
  habitCardDone: { backgroundColor: c.surface, borderColor: c.successBorder },
  habitIcon: {
    width: 48, height: 48, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  habitName: { fontSize: fontSize.md, color: c.textPrimary, fontWeight: '500' },
  habitSub: { fontSize: fontSize.sm, color: c.textMuted, marginTop: 1 },
  takenBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: c.successLight, borderWidth: 0.5, borderColor: c.successBorder,
    borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3,
  },
  takenBadgeText: { fontSize: fontSize.xs, color: c.success, fontWeight: '500' },
  reminderTime: { fontSize: fontSize.sm, color: c.textMuted },
  logBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, marginHorizontal: spacing.lg, marginTop: spacing.xs,
    paddingVertical: spacing.md, borderWidth: 0.5, borderColor: c.border,
    borderRadius: radius.md, backgroundColor: c.surface,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 }, android: { elevation: 2 } }),
  },
  logBtnText: { fontSize: fontSize.sm, color: c.primary, fontWeight: '500' },
  emptyCard: {
    marginHorizontal: spacing.lg, backgroundColor: c.surface,
    borderWidth: 0.5, borderColor: c.border, borderRadius: radius.lg,
    padding: spacing.xxl, alignItems: 'center', gap: spacing.sm,
  },
  emptyTitle: { fontSize: fontSize.md, color: c.textSecondary, fontWeight: '500' },
  emptySubtitle: { fontSize: fontSize.sm, color: c.textMuted, textAlign: 'center' },
  allDoneCard: {
    marginHorizontal: spacing.lg, marginTop: spacing.lg,
    backgroundColor: c.successLight, borderWidth: 0.5, borderColor: c.successBorder,
    borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', gap: spacing.sm,
    ...Platform.select({ ios: { shadowColor: c.success, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6 }, android: { elevation: 3 } }),
  },
  allDoneTitle: { fontSize: fontSize.lg, fontWeight: '700', color: c.success },
  allDoneSub: { fontSize: fontSize.sm, color: c.success, textAlign: 'center' },
  focusHint: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    marginHorizontal: spacing.lg, marginBottom: spacing.sm,
    paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: c.primaryLight,
  },
  focusHintText: { fontSize: fontSize.sm, color: c.primary, fontWeight: '500' },
});
