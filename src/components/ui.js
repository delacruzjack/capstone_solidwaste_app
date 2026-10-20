import React from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, type } from '../theme';

/** Page wrapper: safe area, optional pull-to-refresh, keyboard friendly. */
export function Screen({ children, refreshing, onRefresh, scroll = true, style }) {
  const insets = useSafeAreaInsets();
  const pad = { paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 32 };

  if (!scroll) {
    return <View style={[{ flex: 1, backgroundColor: colors.bg }, pad, style]}>{children}</View>;
  }
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[pad, style]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function Card({ children, style, onPress }) {
  const Body = onPress ? Pressable : View;
  return (
    <Body onPress={onPress} style={[styles.card, style]}>
      {children}
    </Body>
  );
}

export function Button({ title, onPress, loading, variant = 'primary', disabled, style }) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        isPrimary ? styles.btnPrimary : styles.btnGhost,
        (disabled || loading) && { opacity: 0.55 },
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.onPrimary : colors.primary} />
      ) : (
        <Text style={[styles.btnText, { color: isPrimary ? colors.onPrimary : colors.primary }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Field({ label, error, style, ...props }) {
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={[type.label, { marginBottom: 6 }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor="#9aa59a"
        style={[styles.input, props.multiline && { minHeight: 96, textAlignVertical: 'top' }, style]}
        {...props}
      />
      {error ? <Text style={[type.small, { color: colors.danger, marginTop: 4 }]}>{error}</Text> : null}
    </View>
  );
}

export function Chip({ label, selected, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipOn]}>
      <Text style={[styles.chipText, selected && { color: colors.onPrimary }]}>{label}</Text>
    </Pressable>
  );
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <View style={styles.errorBox}>
      <Text style={{ color: colors.danger, fontSize: 14, lineHeight: 20 }}>{message}</Text>
    </View>
  );
}

/** Loading / error / empty states for list screens. Renders nothing when there is data. */
export function StateView({ loading, error, onRetry, empty, emptyTitle, emptyText }) {
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={[type.heading, { marginBottom: 6, textAlign: 'center' }]}>Couldn’t load this</Text>
        <Text style={[type.small, { textAlign: 'center', marginBottom: 16 }]}>{error}</Text>
        <Button title="Try again" variant="ghost" onPress={onRetry} style={{ paddingHorizontal: 28 }} />
      </View>
    );
  }
  if (empty) {
    return (
      <View style={styles.center}>
        <Text style={[type.heading, { marginBottom: 6, textAlign: 'center' }]}>{emptyTitle}</Text>
        <Text style={[type.small, { textAlign: 'center' }]}>{emptyText}</Text>
      </View>
    );
  }
  return null;
}

export function ScreenTitle({ children, sub }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={type.title}>{children}</Text>
      {sub ? <Text style={[type.small, { marginTop: 4 }]}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  btn: { borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
  btnPrimary: { backgroundColor: colors.primary },
  btnGhost: { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: 'transparent' },
  btnText: { fontSize: 16, fontWeight: '700' },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: 8,
    marginBottom: 8,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.text },
  errorBox: { backgroundColor: colors.dangerLight, borderRadius: radius.md, padding: 12, marginBottom: 14 },
  center: { paddingVertical: 60, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
});
