import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, useColorScheme,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, darkColors, spacing, radius, fontSize } from '../utils/theme';

const { width } = Dimensions.get('window');

const slides = [
  {
    icon: 'checkmark-circle',
    title: 'Sigue tus hábitos',
    desc: 'Registra cada día tus hábitos y mantén el control de tu progreso.',
  },
  {
    icon: 'stats-chart',
    title: 'Estadísticas claras',
    desc: 'Visualiza tu cumplimiento con gráficos, rachas y un mapa de calor anual.',
  },
  {
    icon: 'notifications',
    title: 'Recordatorios',
    desc: 'Activa notificaciones para no olvidar ningún hábito.',
  },
];

export default function OnboardingScreen({ onDone }) {
  const scheme = useColorScheme();
  const c = scheme === 'dark' ? darkColors : colors;
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);

  const s = makeStyles(c);

  const handleNext = () => {
    if (page < slides.length - 1) {
      setPage(p => p + 1);
    } else {
      onDone();
    }
  };

  const slide = slides[page];

  return (
    <View style={[s.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={s.top}>
        <TouchableOpacity onPress={onDone} style={s.skipBtn}>
          <Text style={s.skipText}>Saltar</Text>
        </TouchableOpacity>
      </View>

      <View style={s.content}>
        <View style={s.iconWrap}>
          <Ionicons name={slide.icon} size={80} color={c.primary} />
        </View>
        <Text style={s.title}>{slide.title}</Text>
        <Text style={s.desc}>{slide.desc}</Text>
      </View>

      <View style={s.bottom}>
        <View style={s.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[s.dot, i === page && s.dotActive]} />
          ))}
        </View>
        <TouchableOpacity style={s.nextBtn} onPress={handleNext}>
          <Text style={s.nextText}>
            {page < slides.length - 1 ? 'Siguiente' : 'Comenzar'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.surface1 },
  top: { alignItems: 'flex-end', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  skipBtn: { padding: spacing.sm },
  skipText: { fontSize: fontSize.md, color: c.textSecondary },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl },
  iconWrap: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: c.primaryLight, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  title: { fontSize: fontSize.xxxl, fontWeight: '700', color: c.textPrimary, textAlign: 'center', marginBottom: spacing.md },
  desc: { fontSize: fontSize.lg, color: c.textSecondary, textAlign: 'center', lineHeight: 24 },
  bottom: { alignItems: 'center', gap: spacing.xl, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  dots: { flexDirection: 'row', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.border },
  dotActive: { width: 24, borderRadius: 5, backgroundColor: c.primary },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: c.primary, paddingVertical: spacing.lg, paddingHorizontal: spacing.xxl,
    borderRadius: radius.full, width: '100%', justifyContent: 'center',
  },
  nextText: { fontSize: fontSize.lg, color: '#fff', fontWeight: '600' },
});
