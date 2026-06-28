import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../utils/AppContext';
import { colors, darkColors, spacing, radius, fontSize } from '../utils/theme';
import { todayStr, dateStr } from '../utils/storage';

function dateLabel(ds) {
  const today = todayStr();
  const yesterday = (() => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return dateStr(d);
  })();
  if (ds === today) return 'Hoy';
  if (ds === yesterday) return 'Ayer';
  const d = new Date(ds + 'T12:00:00');
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export default function LogScreen({ navigation }) {
  const scheme = useColorScheme();
  const c = scheme === 'dark' ? darkColors : colors;
  const insets = useSafeAreaInsets();
  const { habits: allHabits, entries, addEntry, unmarkTaken, isHabitTaken } = useApp();
  const habits = allHabits.filter(h => !h.archived);

  const today = todayStr();
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedHabit, setSelectedHabit] = useState(habits[0]?.id || '');
  const [time, setTime] = useState('09:00');
  const [note, setNote] = useState('');

  // Generate last 30 days
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return dateStr(d);
  });

  const handleSave = async () => {
    if (!selectedHabit) {
      Alert.alert('Selecciona un hábito');
      return;
    }
    const alreadyTaken = isHabitTaken(selectedHabit, selectedDate);
    if (alreadyTaken) {
      Alert.alert(
        'Ya registrado',
        `Ya tienes registrado este hábito para ${dateLabel(selectedDate)}. ¿Quieres actualizar la nota?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Actualizar',
            onPress: async () => {
              await addEntry(selectedHabit, selectedDate, time, note);
              Alert.alert('Actualizado', `Registro de ${dateLabel(selectedDate)} actualizado.`);
              setNote('');
            },
          },
        ]
      );
      return;
    }
    await addEntry(selectedHabit, selectedDate, time, note);
    Alert.alert('Guardado', `Registro guardado para ${dateLabel(selectedDate)}.`);
    setNote('');
  };

  const handleUnmark = async (habitId, date) => {
    Alert.alert(
      'Eliminar registro',
      `¿Eliminar el registro del ${dateLabel(date)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => unmarkTaken(habitId, date) },
      ]
    );
  };

  const s = makeStyles(c);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={c.textSecondary} />
        </TouchableOpacity>
        <Text style={s.pageTitle}>Registrar hábito</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Habit selector */}
        <Text style={s.sectionTitle}>HÁBITO</Text>
        <View style={s.card}>
          {habits.map((h, i) => (
            <TouchableOpacity
              key={h.id}
              style={[s.optionRow, i < habits.length - 1 && s.optionBorder,
                selectedHabit === h.id && { backgroundColor: c.primaryLight }]}
              onPress={() => setSelectedHabit(h.id)}
            >
              <Text style={{ fontSize: 20 }}>{h.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.optionName}>{h.name}</Text>
                {h.dose ? <Text style={s.optionDose}>{h.dose}</Text> : null}
              </View>
              {selectedHabit === h.id && (
                <Ionicons name="checkmark-circle" size={22} color={c.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Date selector */}
        <Text style={[s.sectionTitle, { marginTop: spacing.lg }]}>FECHA</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          {days.map(ds => (
            <TouchableOpacity
              key={ds}
              onPress={() => setSelectedDate(ds)}
              style={[s.dateChip, selectedDate === ds && { backgroundColor: c.primary, borderColor: c.primary }]}
            >
              <Text style={[s.dateChipText, selectedDate === ds && { color: '#fff' }]}>
                {dateLabel(ds)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Time */}
        <Text style={[s.sectionTitle, { marginTop: spacing.lg }]}>HORA</Text>
        <View style={[s.card, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
          <TextInput
            style={s.timeInput}
            value={time}
            onChangeText={setTime}
            placeholder="09:00"
            placeholderTextColor={c.textMuted}
            keyboardType="numbers-and-punctuation"
          />
        </View>

        {/* Note */}
        <Text style={[s.sectionTitle, { marginTop: spacing.lg }]}>NOTA (OPCIONAL)</Text>
        <View style={[s.card, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
          <TextInput
            style={s.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Ej: con el desayuno, en ayunas..."
            placeholderTextColor={c.textMuted}
            multiline
          />
        </View>

        {/* Save button */}
        <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
          <Text style={s.saveBtnText}>Guardar registro</Text>
        </TouchableOpacity>

        {/* Recent entries for selected date */}
        {entries.filter(e => e.date === selectedDate).length > 0 && (
          <>
            <Text style={[s.sectionTitle, { marginTop: spacing.lg }]}>
              REGISTROS DE {dateLabel(selectedDate).toUpperCase()}
            </Text>
            <View style={s.card}>
              {entries
                .filter(e => e.date === selectedDate)
                .map((e, i, arr) => {
                  const h = habits.find(hh => hh.id === e.habitId);
                  return (
                    <View key={e.id} style={[s.logRow, i < arr.length - 1 && s.optionBorder]}>
                      <Text style={{ fontSize: 18 }}>{h?.emoji || '✅'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={s.logName}>{h?.name || e.habitId}</Text>
                        <Text style={s.logTime}>{e.time}{e.note ? ` · ${e.note}` : ''}</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleUnmark(e.habitId, e.date)}>
                        <Ionicons name="close-circle-outline" size={22} color={c.danger} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
            </View>
          </>
        )}

        <View style={{ height: spacing.xxl * 2 }} />
      </ScrollView>
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.surface1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: radius.full,
    backgroundColor: c.surface, borderWidth: 0.5, borderColor: c.border,
    alignItems: 'center', justifyContent: 'center',
  },
  pageTitle: { fontSize: fontSize.lg, fontWeight: '600', color: c.textPrimary },
  sectionTitle: {
    fontSize: fontSize.xs, fontWeight: '600', color: c.textMuted,
    letterSpacing: 0.8, paddingHorizontal: spacing.lg, marginBottom: spacing.sm,
  },
  card: {
    marginHorizontal: spacing.lg, backgroundColor: c.surface,
    borderWidth: 0.5, borderColor: c.border, borderRadius: radius.lg, overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg,
  },
  optionBorder: { borderBottomWidth: 0.5, borderBottomColor: c.border },
  optionName: { fontSize: fontSize.md, color: c.textPrimary },
  optionDose: { fontSize: fontSize.sm, color: c.textMuted },
  dateChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 0.5, borderColor: c.border,
    backgroundColor: c.surface,
  },
  dateChipText: { fontSize: fontSize.sm, color: c.textSecondary, fontWeight: '400' },
  timeInput: {
    fontSize: fontSize.xl, fontWeight: '500', color: c.textPrimary,
    paddingVertical: spacing.xs,
  },
  noteInput: {
    fontSize: fontSize.md, color: c.textPrimary,
    minHeight: 60, paddingVertical: spacing.xs,
  },
  saveBtn: {
    marginHorizontal: spacing.lg, marginTop: spacing.lg,
    backgroundColor: c.primary, borderRadius: radius.md,
    padding: spacing.lg, alignItems: 'center',
  },
  saveBtnText: { fontSize: fontSize.md, fontWeight: '600', color: '#fff' },
  logRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg,
  },
  logName: { fontSize: fontSize.sm, color: c.textPrimary, fontWeight: '500' },
  logTime: { fontSize: fontSize.xs, color: c.textMuted },
});
