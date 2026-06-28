import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme,
  Modal, TextInput, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../utils/AppContext';
import { colors, darkColors, spacing, radius, fontSize } from '../utils/theme';
import { dateStr, calcStreak, calcBestStreak } from '../utils/storage';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAY_LABELS = ['L','M','X','J','V','S','D'];

function getDayEntries(entries, habits, ds) {
  const dayEntries = entries.filter(e => e.date === ds);
  return habits.map(h => ({
    habit: h,
    done: dayEntries.some(e => e.habitId === h.id),
    entry: dayEntries.find(e => e.habitId === h.id),
  }));
}

export default function CalendarScreen() {
  const scheme = useColorScheme();
  const c = scheme === 'dark' ? darkColors : colors;
  const insets = useSafeAreaInsets();
  const { habits: allHabits, entries, addEntry, unmarkTaken } = useApp();
  const habits = allHabits.filter(h => !h.archived);

  const today = useMemo(() => new Date(), []);
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(null);
  const [editEntry, setEditEntry] = useState(null);
  const [editNote, setEditNote] = useState('');
  const [editTime, setEditTime] = useState('');

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const startOffset = firstDow === 0 ? 6 : firstDow - 1;
  const prevDays = new Date(year, month, 0).getDate();

  const changeMonth = (dir) => {
    const newDate = new Date(year, month + dir, 1);
    setViewDate(newDate);
    setSelectedDate(null);
  };

  const goToday = () => {
    const newDate = new Date(today.getFullYear(), today.getMonth(), 1);
    setViewDate(newDate);
    setSelectedDate(dateStr(today));
  };

  const streak = calcStreak(habits, entries);
  const bestStreak = calcBestStreak(habits, entries);

  const monthStats = useMemo(() => {
    let totalDone = 0;
    let totalMissed = 0;
    let daysFull = 0;
    let daysPartial = 0;
    let daysZero = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dd = new Date(year, month, d);
      if (dd > today) break;
      const ds = dateStr(dd);
      const dayHabits = getDayEntries(entries, habits, ds);
      const done = dayHabits.filter(h => h.done).length;
      const todo = dayHabits.length;

      if (todo === 0) continue;
      totalDone += done;
      totalMissed += todo - done;
      if (done === todo) daysFull++;
      else if (done === 0) daysZero++;
      else daysPartial++;
    }
    return { totalDone, totalMissed, daysFull, daysPartial, daysZero };
  }, [habits, entries, year, month, daysInMonth, today]);

  const todayStr = dateStr(today);

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  const s = makeStyles(c);

  const heatmapData = useMemo(() => {
    const data = [];
    const end = new Date(today);
    const start = new Date(today);
    start.setFullYear(start.getFullYear() - 1);
    start.setDate(start.getDate() + 1);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ds = dateStr(d);
      const dayHabits = getDayEntries(entries, habits, ds);
      const done = dayHabits.filter(h => h.done).length;
      const total = dayHabits.length;
      const pct = total > 0 ? Math.round(done / total * 100) : -1;
      data.push({ ds, pct, isWeekend: d.getDay() === 0 || d.getDay() === 6 });
    }
    return data;
  }, [habits, entries, today]);

  const [showHeatmap, setShowHeatmap] = useState(false);
  const heatmapColor = (pct) => {
    if (pct === -1) return 'transparent';
    if (pct === 0) return c.dangerLight;
    if (pct < 100) return c.warningLight;
    return c.successLight;
  };

  const handleEditEntry = (entry) => {
    setEditEntry(entry);
    setEditNote(entry?.note || '');
    setEditTime(entry?.time || '');
  };

  const handleSaveEdit = async () => {
    if (!editEntry) return;
    await addEntry(editEntry.habitId, editEntry.date, editTime, editNote);
    setEditEntry(null);
  };

  const days = useMemo(() => {
    const result = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const ds = dateStr(new Date(year, month, i));
      const dayHabits = getDayEntries(entries, habits, ds);
      const done = dayHabits.filter(h => h.done).length;
      const total = dayHabits.length;
      const isFuture = new Date(year, month, i) > today;
      const isToday = ds === todayStr;
      result.push({ day: i, ds, dayHabits, done, total, isFuture, isToday });
    }
    return result;
  }, [habits, entries, year, month, daysInMonth, todayStr, today]);

  const selectedDay = selectedDate ? days.find(d => d.ds === selectedDate) : null;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.pageTitle}>Historial</Text>
          <TouchableOpacity style={s.todayBtn} onPress={goToday}>
            <Ionicons name="today-outline" size={18} color={c.primary} />
            <Text style={s.todayBtnText}>Hoy</Text>
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          <View style={s.statItem}>
            <Text style={s.statVal}>{streak}</Text>
            <Text style={s.statLbl}>Racha</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statVal}>{bestStreak}</Text>
            <Text style={s.statLbl}>Mejor</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={[s.statVal, { color: c.success }]}>{monthStats.totalDone}</Text>
            <Text style={s.statLbl}>Hechos</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={[s.statVal, monthStats.totalMissed > 0 && { color: c.danger }]}>{monthStats.totalMissed}</Text>
            <Text style={s.statLbl}>Fallados</Text>
          </View>
        </View>

        {/* Calendar */}
        <Text style={s.sectionTitle}>{MONTHS[month].toUpperCase()} {year}</Text>
        <View style={s.calCard}>
          <View style={s.calHeader}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={s.calNavBtn}>
              <Ionicons name="chevron-back" size={20} color={c.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={s.calMonthBtn} onPress={goToday}>
              <Text style={s.calMonthLabel}>{MONTHS[month]} {year}</Text>
              {!isCurrentMonth && (
                <Ionicons name="today-outline" size={14} color={c.primary} style={{ marginLeft: 4 }} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => changeMonth(1)}
              style={s.calNavBtn}
              disabled={isCurrentMonth}
            >
              <Ionicons
                name="chevron-forward" size={20}
                color={isCurrentMonth ? c.border : c.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <View style={s.calGrid}>
            {DAY_LABELS.map(d => (
              <View key={d} style={s.calDayLabel}>
                <Text style={s.calDayLabelText}>{d}</Text>
              </View>
            ))}

            {Array.from({ length: startOffset }).map((_, i) => (
              <View key={`prev-${i}`} style={s.calDay}>
                <Text style={[s.calDayText, { color: c.border }]}>
                  {prevDays - startOffset + i + 1}
                </Text>
              </View>
            ))}

            {days.map(({ day, ds, dayHabits, done, total, isFuture, isToday }) => {
              let cellStyle = [s.calDay];
              let numStyle = [s.calDayText, { color: c.textSecondary }];
              let dotColors = [];
              let isSelected = selectedDate === ds;

              if (isSelected) {
                cellStyle.push(s.calDaySelected);
              }

              if (isToday) {
                cellStyle.push(s.calDayToday);
                numStyle = [s.calDayText, { color: c.primary, fontWeight: '700' }];
              }

              if (!isFuture && total > 0) {
                dotColors = dayHabits.map(h => ({
                  color: h.done ? c.success : c.danger,
                  done: h.done,
                }));
                if (done === total) {
                  cellStyle.push({ backgroundColor: c.successLight });
                  numStyle = [s.calDayText, { color: c.success, fontWeight: '700' }];
                } else if (done > 0) {
                  cellStyle.push({ backgroundColor: c.warningLight });
                  numStyle = [s.calDayText, { color: c.warning, fontWeight: '600' }];
                } else {
                  cellStyle.push({ backgroundColor: c.dangerLight });
                  numStyle = [s.calDayText, { color: c.danger }];
                }
              }

              return (
                <TouchableOpacity
                  key={ds}
                  style={cellStyle}
                  onPress={() => setSelectedDate(isSelected ? null : ds)}
                  activeOpacity={0.6}
                >
                  <Text style={numStyle}>{day}</Text>
                  {dotColors.length > 0 && (
                    <View style={s.calDotsRow}>
                      {dotColors.slice(0, 4).map((dc, di) => (
                        <View key={di} style={[s.calDot, { backgroundColor: dc.color }]} />
                      ))}
                      {dotColors.length > 4 && (
                        <Text style={s.calDotMore}>+</Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Month progress bar */}
          {monthStats.totalDone + monthStats.totalMissed > 0 && (
            <View style={s.monthBar}>
              <View style={s.monthBarBg}>
                <View style={[s.monthBarFill, {
                  width: `${Math.round(monthStats.totalDone / (monthStats.totalDone + monthStats.totalMissed) * 100)}%`,
                  backgroundColor: c.success,
                }]} />
              </View>
              <Text style={s.monthBarText}>
                {Math.round(monthStats.totalDone / (monthStats.totalDone + monthStats.totalMissed) * 100)}% completado
              </Text>
            </View>
          )}

          {/* Legend */}
          <View style={s.legend}>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: c.success }]} />
              <Text style={s.legendText}>Hecho</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: c.warning }]} />
              <Text style={s.legendText}>Parcial</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: c.danger }]} />
              <Text style={s.legendText}>Pendiente</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { borderWidth: 1.5, borderColor: c.primary, backgroundColor: 'transparent' }]} />
              <Text style={s.legendText}>Hoy</Text>
            </View>
          </View>
        </View>

        {/* Year heatmap toggle */}
        <TouchableOpacity
          style={s.heatmapToggle}
          onPress={() => setShowHeatmap(v => !v)}
        >
          <Ionicons name={showHeatmap ? 'grid' : 'grid-outline'} size={16} color={c.textSecondary} />
          <Text style={s.heatmapToggleText}>
            {showHeatmap ? 'Ocultar' : 'Ver'} mapa anual
          </Text>
          <Ionicons name={showHeatmap ? 'chevron-up' : 'chevron-down'} size={14} color={c.textMuted} />
        </TouchableOpacity>

        {showHeatmap && (
          <View style={s.heatmapCard}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
              {heatmapData.map((d, i) => (
                <View
                  key={d.ds}
                  style={{
                    width: 8, height: 8, borderRadius: 2,
                    backgroundColor: heatmapColor(d.pct),
                    borderWidth: d.pct === -1 ? 0.5 : 0,
                    borderColor: c.border,
                  }}
                />
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, justifyContent: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: c.dangerLight }} />
                <Text style={{ fontSize: 9, color: c.textMuted }}>0%</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: c.warningLight }} />
                <Text style={{ fontSize: 9, color: c.textMuted }}>&lt;100%</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: c.successLight }} />
                <Text style={{ fontSize: 9, color: c.textMuted }}>100%</Text>
              </View>
            </View>
          </View>
        )}

        {/* Selected day detail */}
        {selectedDay && (
          <>
            <Text style={s.sectionTitle}>
              {selectedDay.isToday ? 'HOY' : `${selectedDay.day} DE ${MONTHS[month].toUpperCase()}`}
            </Text>
            <View style={s.dayDetailCard}>
              {selectedDay.dayHabits.length === 0 ? (
                <Text style={s.emptyLog}>Sin hábitos configurados.</Text>
              ) : (
                selectedDay.dayHabits.map(({ habit, done, entry }) => (
                  <TouchableOpacity
                    key={habit.id}
                    style={s.dayHabitRow}
                    onPress={() => entry && handleEditEntry(entry)}
                    activeOpacity={0.7}
                  >
                    <View style={[s.dayHabitDot, { backgroundColor: done ? c.successLight : c.dangerLight, borderColor: done ? c.successBorder : c.dangerBorder }]}>
                      <Ionicons
                        name={done ? 'checkmark' : 'close'}
                        size={14}
                        color={done ? c.success : c.danger}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.dayHabitName}>{habit.emoji} {habit.name}</Text>
                      {entry?.note && <Text style={s.dayHabitNote}>{entry.note}</Text>}
                    </View>
                    {entry && (
                      <Text style={s.dayHabitTime}>{entry.time}</Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>
          </>
        )}

        {/* Recent log */}
        <Text style={[s.sectionTitle, { marginTop: spacing.lg }]}>REGISTRO RECIENTE</Text>
        <View style={s.logCard}>
          {entries.length === 0 ? (
            <Text style={s.emptyLog}>Sin registros todavía.</Text>
          ) : (
            [...entries]
              .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
              .slice(0, 15)
              .map((e, i, arr) => {
                const habit = habits.find(h => h.id === e.habitId);
                const d = new Date(e.date + 'T12:00:00');
                const mo = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
                const label = e.date === todayStr ? 'Hoy' : `${d.getDate()} ${mo[d.getMonth()]}`;
                return (
                  <View key={e.id} style={[s.logRow, i < arr.length - 1 && s.logRowBorder]}>
                    <View style={[s.logDot, { backgroundColor: c.success }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.logName}>{habit?.emoji} {habit?.name || e.habitId}</Text>
                      {e.note ? <Text style={s.logNote}>{e.note}</Text> : null}
                    </View>
                    <Text style={s.logTime}>{label} · {e.time}</Text>
                  </View>
                );
              })
          )}
        </View>

        <View style={{ height: spacing.xxl * 2 }} />
      </ScrollView>

      <Modal visible={editEntry !== null} transparent animationType="fade">
        <TouchableOpacity
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}
          activeOpacity={1}
          onPress={() => setEditEntry(null)}
        >
          <TouchableOpacity activeOpacity={1} style={{
            backgroundColor: c.surface, borderRadius: radius.lg, width: 300, padding: spacing.xl, gap: spacing.md,
          }}>
            <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: c.textPrimary, textAlign: 'center' }}>
              Editar registro
            </Text>
            <View>
              <Text style={{ fontSize: fontSize.xs, color: c.textMuted, fontWeight: '600', marginBottom: spacing.xs }}>HORA</Text>
              <TextInput
                style={[s.input]}
                value={editTime}
                onChangeText={setEditTime}
                placeholder="09:00"
                placeholderTextColor={c.textMuted}
              />
            </View>
            <View>
              <Text style={{ fontSize: fontSize.xs, color: c.textMuted, fontWeight: '600', marginBottom: spacing.xs }}>NOTA</Text>
              <TextInput
                style={[s.input, { minHeight: 60 }]}
                value={editNote}
                onChangeText={setEditNote}
                placeholder="Añadir nota..."
                placeholderTextColor={c.textMuted}
                multiline
              />
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity
                onPress={() => setEditEntry(null)}
                style={{ flex: 1, paddingVertical: spacing.md, borderRadius: radius.sm, backgroundColor: c.surface1, borderWidth: 0.5, borderColor: c.border, alignItems: 'center' }}
              >
                <Text style={{ fontSize: fontSize.md, color: c.textSecondary, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveEdit}
                style={{ flex: 1, paddingVertical: spacing.md, borderRadius: radius.sm, backgroundColor: c.primary, alignItems: 'center' }}
              >
                <Text style={{ fontSize: fontSize.md, color: '#fff', fontWeight: '600' }}>Guardar</Text>
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
  pageTitle: { fontSize: fontSize.xxl, fontWeight: '700', color: c.textPrimary },
  todayBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 0.5, borderColor: c.primary,
  },
  todayBtnText: { fontSize: fontSize.sm, color: c.primary, fontWeight: '500' },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    marginHorizontal: spacing.lg, marginBottom: spacing.lg,
    backgroundColor: c.surface, borderWidth: 0.5, borderColor: c.border,
    borderRadius: radius.lg, paddingVertical: spacing.md, paddingHorizontal: spacing.sm,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statDivider: { width: 1, height: 32, backgroundColor: c.border },
  statVal: { fontSize: fontSize.xl, fontWeight: '700', color: c.textPrimary },
  statLbl: { fontSize: fontSize.xs, color: c.textMuted, marginTop: 1 },
  sectionTitle: {
    fontSize: fontSize.xs, fontWeight: '700', color: c.textMuted,
    letterSpacing: 0.8, paddingHorizontal: spacing.lg, marginBottom: spacing.sm,
  },
  calCard: {
    marginHorizontal: spacing.lg, backgroundColor: c.surface,
    borderWidth: 0.5, borderColor: c.border, borderRadius: radius.lg,
    padding: spacing.md, overflow: 'hidden',
  },
  calHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.sm, paddingHorizontal: spacing.xs,
  },
  calNavBtn: {
    width: 36, height: 36, borderRadius: radius.sm,
    backgroundColor: c.surface1, borderWidth: 0.5, borderColor: c.border,
    alignItems: 'center', justifyContent: 'center',
  },
  calMonthBtn: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  calMonthLabel: { fontSize: fontSize.md, fontWeight: '600', color: c.textPrimary },
  calGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
  },
  calDayLabel: { width: '14.28%', alignItems: 'center', paddingVertical: spacing.xs },
  calDayLabelText: { fontSize: fontSize.xs, color: c.textMuted, fontWeight: '600' },
  calDay: {
    width: '14.28%', paddingVertical: 6,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.md,
    minHeight: 42,
    borderWidth: 2, borderColor: c.surface,
  },
  calDaySelected: {
    borderWidth: 2, borderColor: c.primary,
  },
  calDayToday: {
    borderWidth: 1.5, borderColor: c.primary,
  },
  calDayText: { fontSize: fontSize.sm },
  calDotsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2,
  },
  calDot: {
    width: 6, height: 6, borderRadius: 3,
  },
  calDotMore: { fontSize: 7, color: c.textMuted },
  monthBar: {
    marginTop: spacing.md, paddingHorizontal: spacing.sm,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
  },
  monthBarBg: {
    flex: 1, height: 6, borderRadius: 3,
    backgroundColor: c.surface1, overflow: 'hidden',
  },
  monthBarFill: { height: 6, borderRadius: 3 },
  monthBarText: { fontSize: fontSize.xs, color: c.textMuted, minWidth: 100 },
  legend: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md,
    marginTop: spacing.md, justifyContent: 'center',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 0 },
  legendText: { fontSize: fontSize.xs, color: c.textMuted },
  dayDetailCard: {
    marginHorizontal: spacing.lg, backgroundColor: c.surface,
    borderWidth: 0.5, borderColor: c.border, borderRadius: radius.lg,
    overflow: 'hidden',
  },
  dayHabitRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    borderBottomWidth: 0.5, borderBottomColor: c.border,
  },
  dayHabitDot: {
    width: 28, height: 28, borderRadius: radius.full,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  dayHabitName: { fontSize: fontSize.sm, color: c.textPrimary, fontWeight: '500' },
  dayHabitNote: { fontSize: fontSize.xs, color: c.textMuted, marginTop: 1 },
  dayHabitTime: { fontSize: fontSize.xs, color: c.textMuted },
  logCard: {
    marginHorizontal: spacing.lg, backgroundColor: c.surface,
    borderWidth: 0.5, borderColor: c.border, borderRadius: radius.lg,
    paddingHorizontal: spacing.lg, overflow: 'hidden',
  },
  logRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  logRowBorder: { borderBottomWidth: 0.5, borderBottomColor: c.border },
  logDot: { width: 8, height: 8, borderRadius: 4 },
  logName: { fontSize: fontSize.sm, color: c.textPrimary },
  logNote: { fontSize: fontSize.xs, color: c.textMuted },
  logTime: { fontSize: fontSize.xs, color: c.textMuted },
  emptyLog: { fontSize: fontSize.sm, color: c.textMuted, paddingVertical: spacing.lg, textAlign: 'center' },
  input: {
    backgroundColor: c.surface1, borderWidth: 0.5, borderColor: c.border,
    borderRadius: radius.sm, padding: spacing.md,
    fontSize: fontSize.md, color: c.textPrimary,
  },
  heatmapToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    marginHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
  },
  heatmapToggleText: { fontSize: fontSize.sm, color: c.textSecondary, fontWeight: '500' },
  heatmapCard: {
    marginHorizontal: spacing.lg, backgroundColor: c.surface,
    borderWidth: 0.5, borderColor: c.border, borderRadius: radius.lg,
    padding: spacing.md, marginBottom: spacing.lg,
  },
});
