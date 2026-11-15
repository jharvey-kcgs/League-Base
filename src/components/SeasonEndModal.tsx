import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';
import { LogoChip } from './LogoChip';
import { getTeam } from '../data/teamsStore';
import { WORLDS_CHAMPION } from '../data/worldsChampion';

/** Bump this key (e.g. ...Seen2027) to show a new end-of-season message. */
const SEEN_KEY = 'leagueBase.seasonEnd2026Seen';
const GOLD = '#F5C542';

/** One-time "the season is over" pop-up. Shown once per install: the first
 * time the app opens after this update, then never again once dismissed.
 * Storage failures are swallowed — worst case it just doesn't show. */
export function SeasonEndModal() {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const champion = getTeam(WORLDS_CHAMPION.teamId);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(SEEN_KEY);
        if (!seen && !cancelled) setVisible(true);
      } catch {
        // can't read storage — skip the pop-up rather than risk nagging every launch
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    AsyncStorage.setItem(SEEN_KEY, '1').catch(() => {});
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: GOLD }]}>
          {champion ? <LogoChip url={champion.logoUrl} name={champion.name} ringColor={GOLD} size={72} /> : null}
          <AppText weight="bold" style={[styles.title, { color: colors.text }]}>
            The 2026 Season Has Ended
          </AppText>
          <AppText style={[styles.body, { color: colors.textMuted }]}>
            BLG has taken home the trophy to the LPL in China! The off-season has begun and roster changes are
            underway. Stay tuned for new teams as they are built!
          </AppText>
          <Pressable
            onPress={dismiss}
            style={({ pressed }: { pressed: boolean }) => [
              styles.button,
              { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <AppText weight="bold" style={{ color: colors.accentText }}>
              Got it
            </AppText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 380, borderWidth: 2, borderRadius: 16, padding: 22, alignItems: 'center', gap: 12 },
  title: { fontSize: 20, textAlign: 'center', marginTop: 4 },
  body: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  button: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 12, borderRadius: 10, marginTop: 8 },
});
