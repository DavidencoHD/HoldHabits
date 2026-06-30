import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Share, Modal, Alert, TextInput, Platform, FlatList,
  Animated, PanResponder, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../utils/AppContext';
import { colors, darkColors, spacing, radius, fontSize } from '../utils/theme';
import { dateStr, calcStreak, calcBestStreak } from '../utils/storage';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

function Bar({ value, max, label, color, height = 80 }) {
  const h = max > 0 ? (value / max) * height : 0;
  return (
    <View style={{ alignItems: 'center', gap: 4, flex: 1 }}>
      <Text style={{ fontSize: 10, color: color || '#666', fontWeight: '700', fontVariant: ['tabular-nums'] }}>
        {value}%
      </Text>
      <View style={{ width: '100%', height, backgroundColor: '#eee', borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' }}>
        <View style={{ height: Math.max(h, 2), backgroundColor: color || '#4F8EF7', borderRadius: 4 }} />
      </View>
      <Text style={{ fontSize: 9, color: '#999', textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const DISMISS_THRESHOLD = 100;

function BottomSheet({ c, onClose, children }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5,
    onPanResponderGrant: () => {},
    onPanResponderMove: (_, gs) => {
      if (gs.dy < 0) return;
      translateY.setValue(Math.max(0, gs.dy * 0.6));
    },
    onPanResponderRelease: (_, gs) => {
      if (gs.dy > DISMISS_THRESHOLD) {
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }).start(() => onCloseRef.current?.());
      } else {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          friction: 7,
        }).start();
      }
    },
  }), [translateY]);

  useEffect(() => {
    translateY.setValue(0);
  });

  return (
    <Animated.View
      style={{
        backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingTop: spacing.xl, paddingHorizontal: spacing.lg,
        maxHeight: '80%',
        transform: [{ translateY }],
      }}
      {...panResponder.panHandlers}
    >
      {children}
    </Animated.View>
  );
}

function exportCSV(habits, entries) {
  const header = 'Fecha,Hábito,Hora,Nota';
  const rows = entries.map(e => {
    const h = habits.find(hh => hh.id === e.habitId);
    return `"${e.date}","${h?.name || e.habitId}","${e.time}","${(e.note || '').replace(/"/g, '""')}"`;
  });
  const csv = [header, ...rows].join('\n');
  Share.share({ message: csv, title: 'HoldHabits - Exportar datos' });
}

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { habits: allHabits, entries, handleExport, handleImport, resolvedScheme } = useApp();
  const c = resolvedScheme === 'dark' ? darkColors : colors;
  const habits = allHabits.filter(h => !h.archived);
  const today = new Date();

  const [selectedHabit, setSelectedHabit] = useState(null);
  const [showBackup, setShowBackup] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [detailMonthOffset, setDetailMonthOffset] = useState(0);

  const streak = calcStreak(habits, entries);
  const bestStreak = calcBestStreak(habits, entries);

  const weekData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      const ds = dateStr(d);
      const done = habits.filter(h => entries.some(e => e.date === ds && e.habitId === h.id)).length;
      const pct = habits.length > 0 ? Math.round(done / habits.length * 100) : 0;
      return { label: DAYS[d.getDay()], pct, date: ds };
    });
  }, [habits, entries, today]);

  const maxPct = Math.max(...weekData.map(d => d.pct), 1);

  const habitStreaks = useMemo(() => {
    return habits.map(h => {
      const habitEntries = entries.filter(e => e.habitId === h.id).map(e => e.date);
      const uniqueDates = [...new Set(habitEntries)].sort().reverse();
      let cur = 0;
      for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const ds = dateStr(d);
        if (uniqueDates.includes(ds)) cur++;
        else if (i > 0) break;
      }
      const last30 = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        return dateStr(d);
      });
      const done30 = last30.filter(ds => uniqueDates.includes(ds)).length;
      const last7 = last30.slice(0, 7);
      const done7 = last7.filter(ds => uniqueDates.includes(ds)).length;
      return { ...h, currentStreak: cur, rate30: Math.round(done30 / 30 * 100), rate7: Math.round(done7 / 7 * 100) };
    }).sort((a, b) => b.currentStreak - a.currentStreak);
  }, [habits, entries, today]);

  function getMonthData(habitId, year, month) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDow = new Date(year, month, 1).getDay();
    const startOffset = firstDow === 0 ? 6 : firstDow - 1;
    const days = [];
    for (let i = 0; i < startOffset; i++) {
      days.push(null);
    }
    const today = new Date();
    let doneCount = 0, totalCount = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dd = new Date(year, month, d);
      const ds = dateStr(dd);
      const done = entries.some(e => e.date === ds && e.habitId === habitId);
      const isFuture = dd > today;
      if (!isFuture) { totalCount++; if (done) doneCount++; }
      days.push({ day: d, done, isFuture });
    }
    return { month, year, days, doneCount, totalCount };
  }

  const habitMonthData = useMemo(() => {
    if (!selectedHabit) return null;
    const now = new Date();
    let m = now.getMonth() - detailMonthOffset;
    let y = now.getFullYear();
    while (m < 0) { m += 12; y--; }
    return getMonthData(selectedHabit.id, y, m);
  }, [selectedHabit, entries, detailMonthOffset]);

  const yearMonths = useMemo(() => {
    if (!selectedHabit) return [];
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      let m = now.getMonth() - i;
      let y = now.getFullYear();
      while (m < 0) { m += 12; y--; }
      const data = getMonthData(selectedHabit.id, y, m);
      const pct = data.totalCount > 0 ? Math.round(data.doneCount / data.totalCount * 100) : -1;
      return { label: MONTHS[data.month].slice(0, 3), pct, year: data.year };
    }).reverse();
  }, [selectedHabit, entries]);

  const s = makeStyles(c);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.pageTitle}>Estadísticas</Text>
        <TouchableOpacity style={s.exportBtn} onPress={() => exportCSV(habits, entries)}>
          <Ionicons name="share-outline" size={18} color={c.primary} />
          <Text style={s.exportText}>Exportar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.statsRow}>
          <View style={s.statItem}>
            <Text style={s.statVal}>{streak}</Text>
            <Text style={s.statLbl}>Racha</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statVal}>{bestStreak}</Text>
            <Text style={s.statLbl}>Mejor racha</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statVal}>{habits.length}</Text>
            <Text style={s.statLbl}>Hábitos</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statVal}>{entries.length}</Text>
            <Text style={s.statLbl}>Registros</Text>
          </View>
        </View>

        <Text style={s.sectionTitle}>ÚLTIMA SEMANA</Text>
        <View style={s.card}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs, paddingVertical: spacing.md }}>
            {weekData.map(d => (
              <Bar key={d.date} value={d.pct} max={100} label={d.label} color={c.primary} height={60} />
            ))}
          </View>
        </View>

        <Text style={s.sectionTitle}>RACHAS Y CUMPLIMIENTO</Text>
        <View style={s.card}>
          {habitStreaks.length === 0 ? (
            <Text style={s.emptyText}>Sin datos todavía.</Text>
          ) : (
            <FlatList
              data={habitStreaks}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  onPress={() => setSelectedHabit(item)}
                  style={[s.streakRow, index < habitStreaks.length - 1 && s.streakBorder]}
                >
                  <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                      <Text style={s.streakName}>{item.name}</Text>
                      {item.rate7 >= 80 && (
                        <Ionicons name="flame" size={14} color="#F59E0B" />
                      )}
                    </View>
                    <Text style={s.streakSub}>
                      {item.currentStreak} día{item.currentStreak !== 1 ? 's' : ''} seguidos
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs }}>
                      <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: c.surface1, overflow: 'hidden' }}>
                        <View style={{
                          height: 6, borderRadius: 3,
                          width: `${item.rate30}%`,
                          backgroundColor: item.rate30 >= 80 ? c.success : item.rate30 >= 50 ? c.warning : c.danger,
                        }} />
                      </View>
                      <Text style={{ fontSize: fontSize.xs, color: c.textMuted, minWidth: 40, textAlign: 'right' }}>
                        {item.rate30}%
                      </Text>
                    </View>
                  </View>
                  <View style={s.streakBadge}>
                    <Text style={s.streakBadgeText}>🔥 {item.currentStreak}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>

        {/* Backup/Restore */}
        <View style={s.backupRow}>
          <TouchableOpacity
            style={s.backupBtn}
            onPress={async () => {
              const data = await handleExport();
              Share.share({ message: data, title: 'HoldHabits - Backup' });
            }}
          >
            <Ionicons name="download-outline" size={16} color={c.primary} />
            <Text style={s.backupText}>Exportar backup</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.backupBtn}
            onPress={() => {
              setImportJson('');
              setShowBackup(true);
            }}
          >
            <Ionicons name="cloud-upload-outline" size={16} color={c.primary} />
            <Text style={s.backupText}>Importar backup</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: spacing.xxl * 2 }} />
      </ScrollView>

      {/* Per-habit detail modal with drag to dismiss */}
      <Modal visible={selectedHabit !== null} transparent animationType="fade">
        <TouchableOpacity
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}
          activeOpacity={1}
          onPress={() => { setSelectedHabit(null); setDetailMonthOffset(0); }}
        >
          <BottomSheet c={c} onClose={() => { setSelectedHabit(null); setDetailMonthOffset(0); }}>
            <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
              <View style={{
                width: '100%', flexDirection: 'row', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: spacing.md,
              }}>
                <View style={{ width: 32 }} />
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.border }} />
                <TouchableOpacity onPress={() => { setSelectedHabit(null); setDetailMonthOffset(0); }}>
                  <Ionicons name="close" size={24} color={c.textMuted} />
                </TouchableOpacity>
              </View>
              {selectedHabit && (
                <>
                  <Text style={{ fontSize: 32 }}>{selectedHabit.emoji}</Text>
                  <Text style={{ fontSize: fontSize.xl, fontWeight: '700', color: c.textPrimary, marginTop: spacing.sm }}>
                    {selectedHabit.name}
                  </Text>
                </>
              )}
            </View>

            {selectedHabit && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={s.detailStatsRow}>
                  <View style={s.detailStatItem}>
                    <Text style={s.detailStatVal}>{selectedHabit.currentStreak}</Text>
                    <Text style={s.detailStatLbl}>Racha actual</Text>
                  </View>
                  <View style={s.detailStatItem}>
                    <Text style={s.detailStatVal}>{selectedHabit.rate30}%</Text>
                    <Text style={s.detailStatLbl}>Últimos 30</Text>
                  </View>
                  <View style={s.detailStatItem}>
                    <Text style={s.detailStatVal}>{selectedHabit.rate7}%</Text>
                    <Text style={s.detailStatLbl}>Últimos 7</Text>
                  </View>
                </View>

                {/* 12-month mini bars */}
                {yearMonths.length > 0 && (
                  <View style={{ marginBottom: spacing.lg }}>
                    <Text style={s.sectionTitle}>ÚLTIMOS 12 MESES</Text>
                    <View style={{
                      flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs,
                      paddingHorizontal: spacing.sm, paddingVertical: spacing.md,
                      backgroundColor: c.surface1, borderRadius: radius.lg,
                    }}>
                      {yearMonths.map((ym, i) => {
                        const barColor = ym.pct >= 80 ? c.success : ym.pct >= 50 ? c.warning : c.danger;
                        const barH = ym.pct >= 0 ? Math.max(ym.pct * 0.5, 3) : 3;
                        return (
                          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
                            <View style={{
                              width: '100%', height: 50, borderRadius: 3,
                              backgroundColor: c.surface, overflow: 'hidden',
                              justifyContent: 'flex-end',
                            }}>
                              <View style={{
                                height: barH, borderRadius: 3,
                                backgroundColor: ym.pct >= 0 ? barColor : c.surface2,
                              }} />
                            </View>
                            <Text style={{ fontSize: 7, color: c.textMuted }}>{ym.label}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Monthly mini-calendar with navigation */}
                {habitMonthData && (
                  <View style={{ marginBottom: spacing.lg }}>
                    <View style={{
                      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                      paddingHorizontal: spacing.lg, marginBottom: spacing.sm,
                    }}>
                      <TouchableOpacity onPress={() => setDetailMonthOffset(v => v + 1)}>
                        <Ionicons name="chevron-back" size={20} color={c.primary} />
                      </TouchableOpacity>
                      <View style={{ alignItems: 'center' }}>
                        <Text style={s.sectionTitle}>{MONTHS[habitMonthData.month].toUpperCase()} {habitMonthData.year}</Text>
                        <Text style={{ fontSize: fontSize.xs, color: c.textMuted }}>
                          {habitMonthData.doneCount}/{habitMonthData.totalCount} días
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => detailMonthOffset > 0 && setDetailMonthOffset(v => v - 1)}
                        style={{ opacity: detailMonthOffset > 0 ? 1 : 0.3 }}
                      >
                        <Ionicons name="chevron-forward" size={20} color={c.primary} />
                      </TouchableOpacity>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: spacing.sm, paddingHorizontal: spacing.xs }}>
                      {['L','M','X','J','V','S','D'].map(d => (
                        <View key={d} style={{ flex: 1, alignItems: 'center' }}>
                          <Text style={{ fontSize: 9, color: c.textMuted }}>{d}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.xs }}>
                      {habitMonthData.days.map((d, i) => (
                        <View key={i} style={{
                          width: `${100/7}%`, aspectRatio: 1, padding: 2,
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          {d ? (
                            <View style={{
                              width: 28, height: 28, borderRadius: 14,
                              backgroundColor: d.done ? c.successLight : (d.isFuture ? 'transparent' : c.dangerLight),
                              borderWidth: d.isFuture ? 1 : 0,
                              borderColor: c.border,
                              alignItems: 'center', justifyContent: 'center',
                            }}>
                              <Text style={{
                                fontSize: 11, fontWeight: '600',
                                color: d.done ? c.success : (d.isFuture ? c.textMuted : c.danger),
                              }}>{d.day}</Text>
                            </View>
                          ) : <View />}
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                <View style={{ height: spacing.xxl }} />
              </ScrollView>
            )}
          </BottomSheet>
        </TouchableOpacity>
      </Modal>

      {/* Import modal */}
      <Modal visible={showBackup} transparent animationType="fade">
        <TouchableOpacity
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}
          activeOpacity={1}
          onPress={() => setShowBackup(false)}
        >
          <TouchableOpacity activeOpacity={1} style={{
            backgroundColor: c.surface, borderRadius: radius.lg,
            padding: spacing.xl, width: '85%', gap: spacing.md,
          }}>
            <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: c.textPrimary }}>Importar backup</Text>
            <Text style={{ fontSize: fontSize.sm, color: c.textMuted }}>
              Pega el JSON completo del backup para restaurar todos tus datos.
            </Text>
            <TextInput
              style={{
                backgroundColor: c.surface1, borderWidth: 0.5, borderColor: c.border,
                borderRadius: radius.sm, padding: spacing.md, fontSize: fontSize.sm,
                color: c.textPrimary, maxHeight: 200, textAlignVertical: 'top',
              }}
              value={importJson}
              onChangeText={setImportJson}
              placeholder='{"habits":[...],"entries":[...]}'
              placeholderTextColor={c.textMuted}
              multiline
            />
            <View style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' }}>
              <TouchableOpacity
                onPress={() => setShowBackup(false)}
                style={{ paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: radius.sm, backgroundColor: c.surface1, borderWidth: 0.5, borderColor: c.border }}
              >
                <Text style={{ fontSize: fontSize.md, color: c.textSecondary }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    await handleImport(importJson);
                    setShowBackup(false);
                    Alert.alert('Importado', 'Datos restaurados correctamente.');
                  } catch (e) {
                    Alert.alert('Error', e.message);
                  }
                }}
                style={{ paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: radius.sm, backgroundColor: c.primary }}
              >
                <Text style={{ fontSize: fontSize.md, color: '#fff', fontWeight: '600' }}>Importar</Text>
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
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 0.5, borderColor: c.primary,
  },
  exportText: { fontSize: fontSize.sm, color: c.primary, fontWeight: '500' },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    marginHorizontal: spacing.lg, marginBottom: spacing.lg,
    backgroundColor: c.surface, borderWidth: 0.5, borderColor: c.border,
    borderRadius: radius.lg, paddingVertical: spacing.md,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statDivider: { width: 1, height: 32, backgroundColor: c.border },
  statVal: { fontSize: fontSize.xl, fontWeight: '700', color: c.textPrimary },
  statLbl: { fontSize: fontSize.xs, color: c.textMuted, marginTop: 1 },
  sectionTitle: {
    fontSize: fontSize.xs, fontWeight: '700', color: c.textMuted,
    letterSpacing: 0.8, paddingHorizontal: spacing.lg, marginBottom: spacing.sm,
  },
  card: {
    marginHorizontal: spacing.lg, backgroundColor: c.surface,
    borderWidth: 0.5, borderColor: c.border, borderRadius: radius.lg,
    padding: spacing.md, marginBottom: spacing.lg,
  },
  streakRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md,
  },
  streakBorder: { borderBottomWidth: 0.5, borderBottomColor: c.border },
  streakName: { fontSize: fontSize.md, color: c.textPrimary, fontWeight: '500' },
  streakSub: { fontSize: fontSize.sm, color: c.textMuted, marginTop: 1 },
  streakBadge: {
    backgroundColor: '#FFF3E0', borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: 4,
  },
  streakBadgeText: { fontSize: fontSize.sm, fontWeight: '700', color: '#E65100' },
  emptyText: { fontSize: fontSize.sm, color: c.textMuted, padding: spacing.md, textAlign: 'center' },
  backupRow: {
    flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  backupBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.md,
    borderRadius: radius.md, borderWidth: 0.5, borderColor: c.primary,
    backgroundColor: c.primaryLight,
  },
  backupText: { fontSize: fontSize.sm, color: c.primary, fontWeight: '500' },
  detailStatsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: c.surface1, borderRadius: radius.lg,
    paddingVertical: spacing.lg, marginBottom: spacing.lg,
  },
  detailStatItem: { alignItems: 'center' },
  detailStatVal: { fontSize: fontSize.xl, fontWeight: '700', color: c.textPrimary },
  detailStatLbl: { fontSize: fontSize.xs, color: c.textMuted, marginTop: 2 },
});
