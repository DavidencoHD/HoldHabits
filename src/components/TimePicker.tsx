import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
} from 'react-native';
import { spacing, radius, fontSize } from '../utils/theme';

export default function TimePicker({ hour, minute, onChange, c }) {
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