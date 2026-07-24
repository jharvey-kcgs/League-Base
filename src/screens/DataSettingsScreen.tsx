import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from '../components/AppText';
import { exportAppDataJSON, importAppDataJSON } from '../data/favoriteTeam';

export function DataSettingsScreen() {
  const { colors, refreshFromStorage, clearAll } = useTheme();
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    const json = await exportAppDataJSON();
    try {
      await Share.share({ message: json, title: 'League Base data' });
    } catch {
      // User dismissed the share sheet — nothing to do.
    }
  };

  const handleImport = async () => {
    setImportError(null);
    if (!importText.trim()) {
      setImportError('Paste exported JSON above first.');
      return;
    }
    setBusy(true);
    try {
      await importAppDataJSON(importText.trim());
      await refreshFromStorage();
      setImportText('');
      Alert.alert('Imported', 'Your favorite team and theme mode were restored.');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete all app data?',
      'This clears your favorite team and theme preference. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Second confirmation, since this is destructive and irreversible.
            Alert.alert('Are you sure?', 'You will see the onboarding team picker again.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete everything',
                style: 'destructive',
                onPress: async () => {
                  setBusy(true);
                  await clearAll();
                  setBusy(false);
                  // No manual navigation needed here — App.tsx conditionally
                  // registers Onboarding vs. Home based on favoriteTeamId,
                  // and React Navigation resets to it automatically once
                  // the current route (Home, further up the stack) is no
                  // longer part of the navigator.
                },
              },
            ]);
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Section title="Export" colors={colors}>
        <AppText style={[styles.body, { color: colors.textMuted }]}>
          Shares your favorite team and theme mode as JSON — save it somewhere, or paste it back
          in on another device.
        </AppText>
        <Pressable
          onPress={handleExport}
          style={({ pressed }) => [styles.button, { borderColor: colors.accent, opacity: pressed ? 0.7 : 1 }]}
        >
          <AppText weight="bold" style={{ color: colors.text }}>
            Export data
          </AppText>
        </Pressable>
      </Section>

      <Section title="Import" colors={colors}>
        <AppText style={[styles.body, { color: colors.textMuted }]}>
          Paste previously exported JSON below.
        </AppText>
        <TextInput
          value={importText}
          onChangeText={(t) => {
            setImportText(t);
            setImportError(null);
          }}
          placeholder='{ "favoriteTeamId": "c9", ... }'
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={5}
          style={[
            styles.input,
            { borderColor: importError ? '#D64545' : colors.border, color: colors.text, backgroundColor: colors.surface },
          ]}
        />
        {importError && <AppText style={styles.errorText}>{importError}</AppText>}
        <Pressable
          onPress={handleImport}
          disabled={busy}
          style={({ pressed }) => [
            styles.button,
            { borderColor: colors.accent, opacity: busy ? 0.4 : pressed ? 0.7 : 1 },
          ]}
        >
          <AppText weight="bold" style={{ color: colors.text }}>
            Import data
          </AppText>
        </Pressable>
      </Section>

      <Section title="Delete app data" colors={colors}>
        <AppText style={[styles.body, { color: colors.textMuted }]}>
          Wipes your favorite team and theme preference and returns you to onboarding — useful
          for testing first-launch, or starting over.
        </AppText>
        <Pressable
          onPress={handleDelete}
          disabled={busy}
          style={({ pressed }) => [
            styles.button,
            styles.deleteButton,
            { opacity: busy ? 0.4 : pressed ? 0.7 : 1 },
          ]}
        >
          <AppText weight="bold" style={styles.deleteButtonText}>
            Delete app data
          </AppText>
        </Pressable>
      </Section>
    </ScrollView>
  );
}

function Section({
  title,
  colors,
  children,
}: {
  title: string;
  colors: ReturnType<typeof useTheme>['colors'];
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <AppText weight="bold" style={[styles.sectionTitle, { color: colors.accent }]}>
        {title.toUpperCase()}
      </AppText>
      <View style={[styles.sectionRule, { backgroundColor: colors.border }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { fontSize: 12, letterSpacing: 1 },
  sectionRule: { height: 1, marginTop: 6, marginBottom: 12 },
  body: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  button: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  errorText: { color: '#D64545', fontSize: 12, marginBottom: 10 },
  deleteButton: { borderWidth: 1.5, borderColor: '#D64545' },
  deleteButtonText: { color: '#D64545' },
});
