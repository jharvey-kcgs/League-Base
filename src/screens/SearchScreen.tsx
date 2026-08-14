import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from '../components/AppText';
import { LogoChip } from '../components/LogoChip';
import { PlaceholderCard } from '../components/PlaceholderCard';
import { searchTeams, getRegionDisplayName } from '../data/teamsStore';
import { resolveTeamColor } from '../types/team';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Search'>;

export function SearchScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const results = searchTeams(query);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search any team, any region"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text }]}
          autoFocus
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery('')} hitSlop={12}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {query.trim().length === 0 ? null : results.length === 0 ? (
        <PlaceholderCard label={`No teams match "${query.trim()}"`} permanent />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(r) => r.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <ResultRow
              name={item.team.name}
              logoUrl={item.team.logoUrl}
              region={getRegionDisplayName(item.region)}
              ringColor={resolveTeamColor(item.team, colors.accent)}
              onPress={() => navigation.navigate('TeamDetail', { teamId: item.id })}
            />
          )}
        />
      )}
    </View>
  );
}

function ResultRow({
  name,
  logoUrl,
  region,
  ringColor,
  onPress,
}: {
  name: string;
  logoUrl: string;
  region: string;
  ringColor: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderBottomColor: colors.border, opacity: pressed ? 0.6 : 1 }]}
    >
      <LogoChip url={logoUrl} name={name} ringColor={ringColor} size={40} />
      <View style={styles.rowText}>
        <AppText weight="medium" style={{ color: colors.text }}>
          {name}
        </AppText>
        <AppText style={[styles.rowRegion, { color: colors.textMuted }]}>{region}</AppText>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 16 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: { flex: 1, fontSize: 16, padding: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, gap: 2 },
  rowRegion: { fontSize: 12 },
});
