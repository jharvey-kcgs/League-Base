import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';

export function ErrorFallback({ onReset }: { onReset: () => void }) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <AppText weight="heavy" style={[styles.title, { color: colors.accentReadable }]}>
          Something went wrong
        </AppText>
        <AppText style={[styles.body, { color: colors.textMuted }]}>
          League Base ran into an unexpected error. Your favorite team and settings are safe — this
          just needs a restart.
        </AppText>
        <Pressable
          onPress={onReset}
          style={({ pressed }) => [
            styles.button,
            { borderColor: colors.accent, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <AppText weight="bold" style={{ color: colors.text }}>
            Try Again
          </AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  title: { fontSize: 22, textAlign: 'center' },
  body: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  button: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
});
