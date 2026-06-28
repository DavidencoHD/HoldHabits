import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { colors, darkColors, spacing, radius, fontSize } from '../utils/theme';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.warn('ErrorBoundary caught:', error.message, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <ErrorFallback error={this.state.error} onRetry={() => this.setState({ error: null })} />;
    }
    return this.props.children;
  }
}

function ErrorFallback({ error, onRetry }) {
  const scheme = useColorScheme();
  const c = scheme === 'dark' ? darkColors : colors;

  return (
    <View style={[styles.container, { backgroundColor: c.surface1 }]}>
      <Text style={{ fontSize: 48 }}>⚠️</Text>
      <Text style={[styles.title, { color: c.textPrimary }]}>Algo salió mal</Text>
      <Text style={[styles.message, { color: c.textMuted }]}>{error?.message}</Text>
      <TouchableOpacity
        onPress={onRetry}
        style={[styles.button, { backgroundColor: c.primary }]}
      >
        <Text style={styles.buttonText}>Reintentar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  title: { fontSize: fontSize.xl, fontWeight: '700' },
  message: { fontSize: fontSize.sm, textAlign: 'center' },
  button: { paddingVertical: 14, paddingHorizontal: 32, borderRadius: radius.full, marginTop: 8 },
  buttonText: { color: '#fff', fontSize: fontSize.md, fontWeight: '600' },
});
