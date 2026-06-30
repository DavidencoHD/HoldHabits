import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, Switch, Modal, TextInput, ScrollView,
} from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../utils/AppContext';
import { colors, darkColors, spacing, radius, fontSize } from '../utils/theme';
import { FREQUENCY_OPTIONS } from '../utils/notifications';

const EMOJIS = ['✅', '💊', '📖', '🏃', '💪', '🧘', '💧', '🌿', '🎯', '✍️', '☕', '🥗', '🎵', '🧠', '📝', '⚪'];
const COLORS = ['#4F8EF7', '#22C55E', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];
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
const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function TimePicker({ hour, minute, onChange, c }) {
  const [mode, setMode] = useState(null);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const currentList = mode === 'hour' ? hours : minutes;
  const currentValue = mode === 'hour' ? hour : minute;

  const handleSelect = (value) => {
    if (mode === 'hour') onChange(value, minute);
    else onChange(hour, value);
    setMode(null);
  };

  return (
    <>
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
        borderRadius: radius.lg, paddingVertical: spacing.lg, paddingHorizontal: spacing.xl,
      }}>
        <TouchableOpacity onPress={() => setMode('hour')} style={{ alignItems: 'center', paddingHorizontal: spacing.md }}>
          <Text style={{ fontSize: 36, fontWeight: '300', color: c.textPrimary, fontVariant: ['tabular-nums'] }}>
            {String(hour).padStart(2, '0')}
          </Text>
          <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>Hora</Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 36, fontWeight: '200', color: c.textMuted, marginBottom: 18 }}>:</Text>

        <TouchableOpacity onPress={() => setMode('minute')} style={{ alignItems: 'center', paddingHorizontal: spacing.md }}>
          <Text style={{ fontSize: 36, fontWeight: '300', color: c.textPrimary, fontVariant: ['tabular-nums'] }}>
            {String(minute).padStart(2, '0')}
          </Text>
          <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>Min</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={mode !== null} transparent animationType="fade">
        <TouchableOpacity
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}
          activeOpacity={1}
          onPress={() => setMode(null)}
        >
          <TouchableOpacity activeOpacity={1} style={{
            backgroundColor: c.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
            paddingTop: spacing.lg, maxHeight: 380,
          }}>
            <View style={{
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
              paddingHorizontal: spacing.lg, marginBottom: spacing.sm,
            }}>
              <Text style={{ fontSize: 17, fontWeight: '600', color: c.textPrimary }}>
                {mode === 'hour' ? 'Seleccionar hora' : 'Seleccionar minuto'}
              </Text>
              <TouchableOpacity onPress={() => setMode(null)}>
                <Text style={{ fontSize: 16, color: c.primary, fontWeight: '600' }}>Cerrar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 300 }}>
              {currentList.map((value) => {
                const isSelected = value === currentValue;
                return (
                  <TouchableOpacity
                    key={value}
                    onPress={() => handleSelect(value)}
                    style={{
                      paddingVertical: 14, paddingHorizontal: spacing.xl,
                      backgroundColor: isSelected ? c.primary + '15' : 'transparent',
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Text style={{
                      fontSize: 22, fontWeight: isSelected ? '700' : '400',
                      color: isSelected ? c.primary : c.textPrimary,
                      fontVariant: ['tabular-nums'],
                    }}>
                      {String(value).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function FrequencyPicker({ frequency, interval, onChange, c }) {
  const freqOpts = [
    { key: 'daily', label: 'Diario', icon: 'sunny' },
    { key: 'interval-days', label: 'Días', icon: 'calendar-number' },
    { key: 'interval-weeks', label: 'Semanas', icon: 'calendar' },
    { key: 'interval-months', label: 'Meses', icon: 'calendar' },
  ];

  const getUnit = () => {
    switch (frequency) {
      case 'interval-days': return 'día';
      case 'interval-weeks': return 'semana';
      case 'interval-months': return 'mes';
      default: return '';
    }
  };

  const isDaily = frequency === 'daily';

  return (
    <View style={{ gap: spacing.md }}>
      {/* Segmented control */}
      <View style={[fS.segment, { backgroundColor: c.surface1, borderColor: c.border }]}>
        {freqOpts.map((opt, idx) => (
          <TouchableOpacity
            key={opt.key}
            onPress={() => onChange(opt.key, frequency === opt.key ? interval : 1)}
            style={[
              fS.segmentBtn,
              idx === 0 && { borderTopLeftRadius: radius.sm, borderBottomLeftRadius: radius.sm },
              idx === freqOpts.length - 1 && { borderTopRightRadius: radius.sm, borderBottomRightRadius: radius.sm },
              frequency === opt.key && { backgroundColor: c.primary },
            ]}
          >
            <Text style={[
              fS.segmentText,
              { color: c.textSecondary },
              frequency === opt.key && { color: '#fff', fontWeight: '600' },
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Interval picker for non-daily */}
      {!isDaily && (
        <View style={[fS.intervalCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <TouchableOpacity
            onPress={() => interval > 1 && onChange(frequency, interval - 1)}
            style={[fS.arrowBtn, { backgroundColor: c.surface1, borderColor: c.border }, interval <= 1 && { opacity: 0.3 }]}
          >
            <Ionicons name="remove" size={20} color={c.textSecondary} />
          </TouchableOpacity>

          <View style={{ alignItems: 'center' }}>
            <Text style={[fS.intervalNum, { color: c.textPrimary }]}>{interval}</Text>
            <Text style={[fS.intervalUnit, { color: c.textMuted }]}>
              {getUnit()}{interval > 1 ? 's' : ''}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => interval < 30 && onChange(frequency, interval + 1)}
            style={[fS.arrowBtn, { backgroundColor: c.surface1, borderColor: c.border }, interval >= 30 && { opacity: 0.3 }]}
          >
            <Ionicons name="add" size={20} color={c.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {!isDaily && (
        <Text style={{ fontSize: fontSize.xs, color: c.textMuted, textAlign: 'center' }}>
          Cada {interval} {getUnit()}{interval > 1 ? 's' : ''}
        </Text>
      )}
    </View>
  );
}

const fS = StyleSheet.create({
  segment: {
    flexDirection: 'row', borderRadius: radius.sm,
    borderWidth: 0.5, overflow: 'hidden',
  },
  segmentBtn: {
    flex: 1, paddingVertical: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  segmentText: { fontSize: fontSize.sm, fontWeight: '500' },
  intervalCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.lg, paddingHorizontal: spacing.xl,
    borderRadius: radius.lg, borderWidth: 0.5,
  },
  arrowBtn: {
    width: 44, height: 44, borderRadius: radius.full,
    borderWidth: 0.5, alignItems: 'center', justifyContent: 'center',
  },
  intervalNum: { fontSize: 32, fontWeight: '200', fontVariant: ['tabular-nums'] },
  intervalUnit: { fontSize: fontSize.xs, marginTop: 2 },
});

function ArchivedList({ habits, c, s, showArchived, setShowArchived, restoreHabit, handleDelete }) {
  return (
    <>
      <TouchableOpacity
        onPress={() => setShowArchived(v => !v)}
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
          gap: spacing.xs, paddingVertical: spacing.md, marginTop: spacing.sm,
        }}
      >
        <Ionicons name="archive-outline" size={16} color={c.textMuted} />
        <Text style={{ fontSize: fontSize.sm, color: c.textMuted, fontWeight: '500' }}>
          {showArchived ? 'Ocultar' : 'Mostrar'} archivados ({habits.length})
        </Text>
        <Ionicons name={showArchived ? 'chevron-up' : 'chevron-down'} size={14} color={c.textMuted} />
      </TouchableOpacity>
      {showArchived && habits.map(h => (
        <View key={h.id} style={s.habitCard}>
          <View style={[s.habitEmoji, { backgroundColor: c.surface1, opacity: 0.6 }]}>
            <Text style={{ fontSize: 22, opacity: 0.6 }}>{h.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.habitName, { color: c.textMuted }]}>{h.name}</Text>
            <Text style={{ fontSize: fontSize.xs, color: c.textMuted }}>Archivado</Text>
          </View>
          <TouchableOpacity style={s.iconBtn} onPress={() => restoreHabit(h.id)}>
            <Ionicons name="refresh-outline" size={18} color={c.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={() => handleDelete(h)}>
            <Ionicons name="trash-outline" size={18} color={c.danger} />
          </TouchableOpacity>
        </View>
      ))}
    </>
  );
}

export default function HabitsScreen() {
  const insets = useSafeAreaInsets();
  const { habits, addHabit, updateHabit, deleteHabit, reorderHabits, archiveHabit, restoreHabit, resolvedScheme } = useApp();
  const c = resolvedScheme === 'dark' ? darkColors : colors;

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [showEmojiInput, setShowEmojiInput] = useState(false);
  const [customEmoji, setCustomEmoji] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [form, setForm] = useState({
    name: '',
    dose: '',
    emoji: '✅',
    color: '#4F8EF7',
    category: '',
    reminderEnabled: true,
    reminderTimes: [{ hour: 9, minute: 0 }],
    reminderFrequency: 'daily',
    reminderInterval: 1,
    reminderDays: [],
  });

  const openAdd = () => {
    setForm({ name: '', dose: '', emoji: '✅', color: '#4F8EF7', category: '', reminderEnabled: true, reminderTimes: [{ hour: 9, minute: 0 }], reminderFrequency: 'daily', reminderInterval: 1, reminderDays: [] });
    setEditingHabit(null);
    setShowAddModal(true);
  };

  const openEdit = (habit) => {
    setForm({
      name: habit.name,
      dose: habit.dose || '',
      emoji: habit.emoji,
      color: habit.color,
      category: habit.category || '',
      reminderEnabled: habit.reminderEnabled,
      reminderTimes: habit.reminderTimes?.length ? habit.reminderTimes.map(t => ({ ...t })) : [{ hour: 9, minute: 0 }],
      reminderFrequency: habit.reminderFrequency || 'daily',
      reminderInterval: habit.reminderInterval || 1,
      reminderDays: habit.reminderDays || [],
    });
    setEditingHabit(habit);
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Nombre requerido', 'Introduce el nombre del hábito.');
      return;
    }
    try {
      if (editingHabit) {
        await updateHabit(editingHabit.id, form);
      } else {
        await addHabit(form);
      }
      setShowAddModal(false);
    } catch (e) {
      Alert.alert('Error al guardar', e.message);
    }
  };

  const handleDelete = (habit) => {
    setDeleteConfirm(habit);
  };

  const getFrequencyLabel = (habit) => {
    const freq = habit.reminderFrequency || 'daily';
    const interval = habit.reminderInterval || 1;
    if (freq === 'daily') return 'Diario';
    if (freq === 'interval-days') return `Cada ${interval} día${interval > 1 ? 's' : ''}`;
    if (freq === 'interval-weeks') return `Cada ${interval} semana${interval > 1 ? 's' : ''}`;
    if (freq === 'interval-months') return `Cada ${interval} mes${interval > 1 ? 'es' : ''}`;
    return '';
  };

  const s = makeStyles(c);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.pageTitle}>Hábitos</Text>
        <TouchableOpacity style={s.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {habits.filter(h => !h.archived).length === 0 ? (
        <ScrollView style={{ flex: 1 }}>
          <View style={s.emptyState}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="list-outline" size={40} color={c.textMuted} />
            </View>
            <Text style={s.emptyTitle}>
              {habits.filter(h => h.archived).length > 0 ? 'Todos archivados' : 'Sin hábitos'}
            </Text>
            <Text style={s.emptySub}>
              {habits.filter(h => h.archived).length > 0
                ? 'Pulsa abajo para ver los archivados.'
                : 'Añade tu primer hábito con el botón +'
              }
            </Text>
          </View>
          {habits.filter(h => h.archived).length > 0 && (
            <ArchivedList
              habits={habits.filter(h => h.archived)}
              c={c}
              s={s}
              showArchived={showArchived}
              setShowArchived={setShowArchived}
              restoreHabit={restoreHabit}
              handleDelete={handleDelete}
            />
          )}
          <View style={{ height: spacing.xxl * 3 }} />
        </ScrollView>
      ) : (
        <DraggableFlatList
          data={habits.filter(h => !h.archived)}
          keyExtractor={item => item.id}
          contentContainerStyle={s.habitsList}
          onDragEnd={({ data }) => {
            const archived = habits.filter(h => h.archived);
            reorderHabits([...archived, ...data]);
          }}
          ListFooterComponent={(
            <>
              {habits.filter(h => h.archived).length > 0 && (
                <ArchivedList
                  habits={habits.filter(h => h.archived)}
                  c={c}
                  s={s}
                  showArchived={showArchived}
                  setShowArchived={setShowArchived}
                  restoreHabit={restoreHabit}
                  handleDelete={handleDelete}
                />
              )}
              <View style={{ height: spacing.xxl * 3 }} />
            </>
          )}
          renderItem={({ item, drag, isActive }: RenderItemParams<any>) => (
            <ScaleDecorator>
              <TouchableOpacity
                activeOpacity={0.7}
                onLongPress={drag}
                delayLongPress={150}
                style={[s.habitCard, isActive && { backgroundColor: c.surface2, elevation: 4 }]}
              >
                <TouchableOpacity onPress={drag} style={{ padding: spacing.xs }}>
                  <Ionicons name="reorder-two-outline" size={20} color={c.textMuted} />
                </TouchableOpacity>
                <View style={[s.habitEmoji, { backgroundColor: item.color + '20' }]}>
                  <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.habitName}>{item.name}</Text>
                  {item.dose ? <Text style={s.habitDose}>{item.dose}</Text> : null}
                  <View style={s.habitMeta}>
                    <Ionicons
                      name={item.reminderEnabled ? 'notifications' : 'notifications-off-outline'}
                      size={12}
                      color={item.reminderEnabled ? c.primary : c.textMuted}
                    />
                    <Text style={[s.habitMetaText, !item.reminderEnabled && { color: c.textMuted }]}>
                      {item.reminderEnabled
                        ? `${getFrequencyLabel(item)} · ${(item.reminderTimes || []).map(t => `${String(t.hour).padStart(2,'0')}:${String(t.minute).padStart(2,'0')}`).join(', ')}`
                        : 'Sin recordatorio'
                      }
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                  <TouchableOpacity style={s.iconBtn} onPress={() => openEdit(item)}>
                    <Ionicons name="create-outline" size={18} color={c.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={s.iconBtn} onPress={() => archiveHabit(item.id)}>
                    <Ionicons name="archive-outline" size={18} color={c.textMuted} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </ScaleDecorator>
          )}
        />
      )}

      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[s.modal, { paddingTop: insets.top + spacing.lg }]}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={s.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>{editingHabit ? 'Editar hábito' : 'Nuevo hábito'}</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={s.modalSave}>Guardar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <View style={s.formSection}>
              <Text style={s.formLabel}>Nombre</Text>
              <TextInput
                style={s.input}
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
                placeholder="Ej: Leer 30 min"
                placeholderTextColor={c.textMuted}
              />
            </View>

            <View style={s.formSection}>
              <Text style={s.formLabel}>Detalle (opcional)</Text>
              <TextInput
                style={s.input}
                value={form.dose}
                onChangeText={v => setForm(f => ({ ...f, dose: v }))}
                placeholder="Ej: 1mg, 30 min, ..."
                placeholderTextColor={c.textMuted}
              />
            </View>

            <View style={s.formSection}>
              <Text style={s.formLabel}>Icono</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                {EMOJIS.map(e => (
                  <TouchableOpacity
                    key={e}
                    onPress={() => setForm(f => ({ ...f, emoji: e }))}
                    style={[s.emojiBtn, form.emoji === e && { borderColor: c.primary, borderWidth: 2 }]}
                  >
                    <Text style={{ fontSize: 24 }}>{e}</Text>
                  </TouchableOpacity>
                ))}
                {customEmoji && (
                  <TouchableOpacity
                    onPress={() => setForm(f => ({ ...f, emoji: customEmoji }))}
                    style={[s.emojiBtn, form.emoji === customEmoji && { borderColor: c.primary, borderWidth: 2 }]}
                  >
                    <Text style={{ fontSize: 24 }}>{customEmoji}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => { setShowEmojiInput(true); setCustomEmoji(''); }}
                  style={[s.emojiBtn, { borderColor: c.border, borderStyle: 'dashed' }]}
                >
                  <Ionicons name="add" size={20} color={c.textSecondary} />
                </TouchableOpacity>
              </ScrollView>

              <Modal visible={showEmojiInput} transparent animationType="fade">
                <TouchableOpacity
                  style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}
                  activeOpacity={1}
                  onPress={() => setShowEmojiInput(false)}
                >
                  <TouchableOpacity activeOpacity={1} style={{
                    backgroundColor: c.surface, borderRadius: radius.lg,
                    padding: spacing.xl, width: 280, alignItems: 'center', gap: spacing.md,
                  }}>
                    <Text style={{ fontSize: fontSize.lg, fontWeight: '600', color: c.textPrimary }}>
                      Icono personalizado
                    </Text>
                    <View style={{
                      width: 64, height: 64, borderRadius: radius.md,
                      backgroundColor: c.surface1, borderWidth: 1, borderColor: c.border,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ fontSize: 36 }}>{customEmoji || '?'}</Text>
                    </View>
                    <TextInput
                      style={[s.input, { textAlign: 'center', fontSize: 28, width: '100%' }]}
                      value={customEmoji}
                      onChangeText={setCustomEmoji}
                      placeholder="Pega un emoji"
                      placeholderTextColor={c.textMuted}
                      maxLength={4}
                      autoFocus
                    />
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <TouchableOpacity
                        onPress={() => setShowEmojiInput(false)}
                        style={{
                          paddingVertical: spacing.md, paddingHorizontal: spacing.xl,
                          borderRadius: radius.sm, backgroundColor: c.surface1,
                          borderWidth: 0.5, borderColor: c.border,
                        }}
                      >
                        <Text style={{ fontSize: fontSize.md, color: c.textSecondary }}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          if (customEmoji.trim()) {
                            setForm(f => ({ ...f, emoji: customEmoji.trim() }));
                          }
                          setShowEmojiInput(false);
                        }}
                        style={{
                          paddingVertical: spacing.md, paddingHorizontal: spacing.xl,
                          borderRadius: radius.sm, backgroundColor: c.primary,
                        }}
                      >
                        <Text style={{ fontSize: fontSize.md, color: '#fff', fontWeight: '600' }}>Usar</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                </TouchableOpacity>
              </Modal>
            </View>

            <View style={s.formSection}>
              <Text style={s.formLabel}>Color</Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
                {COLORS.map(col => (
                  <TouchableOpacity
                    key={col}
                    onPress={() => setForm(f => ({ ...f, color: col }))}
                    style={[s.colorBtn, { backgroundColor: col },
                      form.color === col && { borderWidth: 3, borderColor: c.textPrimary }]}
                  />
                ))}
              </View>
            </View>

            <View style={s.formSection}>
              <Text style={s.formLabel}>Categoría</Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.key}
                    onPress={() => setForm(f => ({ ...f, category: cat.key }))}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
                      paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
                      borderRadius: radius.full,
                      backgroundColor: form.category === cat.key ? c.primary : c.surface1,
                      borderWidth: 0.5, borderColor: form.category === cat.key ? c.primary : c.border,
                    }}
                  >
                    <Ionicons name={cat.icon} size={14} color={form.category === cat.key ? '#fff' : c.textSecondary} />
                    <Text style={{
                      fontSize: fontSize.sm, fontWeight: '500',
                      color: form.category === cat.key ? '#fff' : c.textSecondary,
                    }}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[s.formSection, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.formLabel}>Recordatorio</Text>
                <Text style={{ fontSize: fontSize.xs, color: c.textMuted, marginTop: 2 }}>Notificación a la hora elegida</Text>
              </View>
              <Switch
                value={form.reminderEnabled}
                onValueChange={v => setForm(f => ({ ...f, reminderEnabled: v }))}
                trackColor={{ true: c.primary }}
              />
            </View>

            {form.reminderEnabled && (
              <>
                <View style={s.formSection}>
                  <Text style={s.formLabel}>FRECUENCIA</Text>
                  <FrequencyPicker
                    frequency={form.reminderFrequency}
                    interval={form.reminderInterval}
                    onChange={(freq, interval) => setForm(f => ({ ...f, reminderFrequency: freq, reminderInterval: interval }))}
                    c={c}
                  />
                </View>

                {form.reminderFrequency === 'daily' && (
                  <View style={s.formSection}>
                    <Text style={s.formLabel}>DÍAS DE LA SEMANA</Text>
                    <View style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' }}>
                      {DAY_LABELS.map((label, idx) => {
                        const active = form.reminderDays.includes(idx);
                        return (
                          <TouchableOpacity
                            key={idx}
                            onPress={() => {
                              const days = active
                                ? form.reminderDays.filter(d => d !== idx)
                                : [...form.reminderDays, idx];
                              setForm(f => ({ ...f, reminderDays: days }));
                            }}
                            style={{
                              width: 40, height: 40, borderRadius: radius.full,
                              backgroundColor: active ? c.primary : c.surface1,
                              borderWidth: 1, borderColor: active ? c.primary : c.border,
                              alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            <Text style={{
                              fontSize: fontSize.sm, fontWeight: '600',
                              color: active ? '#fff' : c.textSecondary,
                            }}>{label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <Text style={{ fontSize: fontSize.xs, color: c.textMuted, textAlign: 'center', marginTop: spacing.xs }}>
                      {form.reminderDays.length === 0
                        ? 'Todos los días (ninguno seleccionado = cada día)'
                        : `Solo ${form.reminderDays.length} día${form.reminderDays.length > 1 ? 's' : ''} a la semana`
                      }
                    </Text>
                  </View>
                )}

                <View style={s.formSection}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={s.formLabel}>HORARIOS ({form.reminderTimes.length})</Text>
                    {form.reminderTimes.length < 5 && (
                      <TouchableOpacity
                        onPress={() => setForm(f => ({ ...f, reminderTimes: [...f.reminderTimes, { hour: 9, minute: 0 }] }))}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                      >
                        <Ionicons name="add-circle-outline" size={16} color={c.primary} />
                        <Text style={{ fontSize: fontSize.sm, color: c.primary }}>Añadir</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {form.reminderTimes.map((rt, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm }}>
                      <TimePicker
                        hour={rt.hour}
                        minute={rt.minute}
                        onChange={(h, m) => {
                          const newTimes = [...form.reminderTimes];
                          newTimes[idx] = { hour: h, minute: m };
                          setForm(f => ({ ...f, reminderTimes: newTimes }));
                        }}
                        c={c}
                      />
                      {form.reminderTimes.length > 1 && (
                        <TouchableOpacity
                          onPress={() => setForm(f => ({ ...f, reminderTimes: f.reminderTimes.filter((_, i) => i !== idx) }))}
                          style={{ padding: spacing.xs }}
                        >
                          <Ionicons name="close-circle" size={22} color={c.danger} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              </>
            )}

            <View style={{ height: spacing.xxl * 2 }} />
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={deleteConfirm !== null} transparent animationType="fade">
        <TouchableOpacity
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}
          activeOpacity={1}
          onPress={() => setDeleteConfirm(null)}
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
              <Ionicons name="trash-outline" size={28} color={c.danger} />
            </View>
            <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: c.textPrimary }}>Eliminar hábito</Text>
            {deleteConfirm && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
                backgroundColor: c.surface1, borderRadius: radius.sm,
                paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
              }}>
                <Text style={{ fontSize: 20 }}>{deleteConfirm.emoji}</Text>
                <Text style={{ fontSize: fontSize.md, color: c.textSecondary, fontWeight: '500' }}>{deleteConfirm.name}</Text>
              </View>
            )}
            <Text style={{ fontSize: fontSize.sm, color: c.textMuted, textAlign: 'center' }}>
              Se eliminarán también todos los registros de este hábito.
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
              <TouchableOpacity
                onPress={() => setDeleteConfirm(null)}
                style={{ flex: 1, paddingVertical: spacing.md, borderRadius: radius.sm, backgroundColor: c.surface1, borderWidth: 0.5, borderColor: c.border, alignItems: 'center' }}
              >
                <Text style={{ fontSize: fontSize.md, color: c.textSecondary, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { deleteHabit(deleteConfirm.id); setDeleteConfirm(null); }}
                style={{ flex: 1, paddingVertical: spacing.md, borderRadius: radius.sm, backgroundColor: c.danger, alignItems: 'center' }}
              >
                <Text style={{ fontSize: fontSize.md, color: '#fff', fontWeight: '600' }}>Eliminar</Text>
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
  addBtn: {
    width: 40, height: 40, borderRadius: radius.full,
    backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center',
  },
  habitsList: {
    marginHorizontal: spacing.lg, backgroundColor: c.surface,
    borderWidth: 0.5, borderColor: c.border, borderRadius: radius.lg, overflow: 'hidden',
  },
  habitCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md,
  },
  habitCardBorder: { borderBottomWidth: 0.5, borderBottomColor: c.border },
  habitEmoji: {
    width: 44, height: 44, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  habitName: { fontSize: fontSize.md, color: c.textPrimary, fontWeight: '500' },
  habitDose: { fontSize: fontSize.sm, color: c.textMuted, marginTop: 1 },
  habitMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  habitMetaText: { fontSize: fontSize.xs, color: c.primary },
  iconBtn: {
    width: 36, height: 36, borderRadius: radius.sm,
    backgroundColor: c.surface1, borderWidth: 0.5, borderColor: c.border,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center', padding: spacing.xxl, gap: spacing.md,
  },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: radius.full,
    backgroundColor: c.surface, borderWidth: 0.5, borderColor: c.border,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '600', color: c.textSecondary },
  emptySub: { fontSize: fontSize.sm, color: c.textMuted, textAlign: 'center' },
  modal: { flex: 1, backgroundColor: c.surface1 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingBottom: spacing.lg,
    borderBottomWidth: 0.5, borderBottomColor: c.border,
  },
  modalTitle: { fontSize: fontSize.md, fontWeight: '600', color: c.textPrimary },
  modalCancel: { fontSize: fontSize.md, color: c.textSecondary },
  modalSave: { fontSize: fontSize.md, color: c.primary, fontWeight: '600' },
  formSection: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  formLabel: {
    fontSize: fontSize.xs, fontWeight: '600', color: c.textMuted,
    letterSpacing: 0.6, marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: c.surface, borderWidth: 0.5, borderColor: c.border,
    borderRadius: radius.sm, padding: spacing.md,
    fontSize: fontSize.md, color: c.textPrimary,
  },
  emojiBtn: {
    width: 44, height: 44, borderRadius: radius.sm,
    backgroundColor: c.surface, borderWidth: 0.5, borderColor: c.border,
    alignItems: 'center', justifyContent: 'center',
  },
  colorBtn: {
    width: 36, height: 36, borderRadius: radius.full,
    borderWidth: 0.5, borderColor: 'transparent',
  },
});
