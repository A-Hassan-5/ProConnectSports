import { View, Text, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { DEMO_USERS } from '../services/demoData';

const DEFAULT_COLORS = ['#00E676', '#FF6B6B', '#4ECDC4', '#A78BFA', '#FFE66D', '#FB7185', '#38BDF8', '#F97316'];

export default function LeaderboardScreen() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  const buildLeaders = (source) => {
    const seenEmails = new Set();
    const merged = [];

    source.forEach((u) => {
      const key = (u.email || u.id || '').toLowerCase();
      if (key && !seenEmails.has(key)) {
        seenEmails.add(key);
        merged.push(u);
      }
    });

    DEMO_USERS.forEach((u) => {
      const key = (u.email || u.id || '').toLowerCase();
      if (key && !seenEmails.has(key)) {
        seenEmails.add(key);
        merged.push(u);
      }
    });

    return merged
      .sort((a, b) => (b.wins || 0) - (a.wins || 0))
      .slice(0, 8)
      .map((data, idx) => {
        const init = (data.name || 'User')
          .split(' ')
          .map((x) => x[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();

        return {
          id: data.id || `fallback-${idx}`,
          name: data.name || 'Unknown',
          sport: data.sports?.[0] || 'General',
          wins: data.wins || 0,
          color: DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
          init,
        };
      });
  };

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'users'), orderBy('wins', 'desc')),
      (snap) => {
        const source = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setLeaders(buildLeaders(source));
        setLoading(false);
      },
      () => {
        setLeaders(buildLeaders([]));
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#00E676" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Leaderboard</Text>
        <Text style={styles.sub}>Top players by wins</Text>

        {leaders.map((player, index) => (
          <View key={player.id} style={styles.card}>
            <Text style={styles.rank}>{index + 1}</Text>
            <View style={[styles.avatar, { backgroundColor: player.color }]}>
              <Text style={styles.avatarText}>{player.init}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.playerName}>{player.name}</Text>
              <Text style={styles.playerSport}>{player.sport}</Text>
            </View>
            <Text style={styles.score}>{player.wins}</Text>
          </View>
        ))}

        {!leaders.length && <Text style={styles.empty}>No players yet</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  inner: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '800', color: '#F0F0F8', marginBottom: 4 },
  sub: { fontSize: 13, color: '#8A8AA0', marginBottom: 20 },
  card: {
    backgroundColor: '#12121A', borderRadius: 16, padding: 16,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#ffffff10', gap: 14,
  },
  rank: { fontSize: 18, width: 28, textAlign: 'center', color: '#F0F0F8' },
  avatar: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '800', color: '#000' },
  info: { flex: 1 },
  playerName: { fontSize: 15, fontWeight: '500', color: '#F0F0F8' },
  playerSport: { fontSize: 12, color: '#8A8AA0', marginTop: 2 },
  score: { fontSize: 20, fontWeight: '800', color: '#00E676' },
  empty: { textAlign: 'center', color: '#55556A', marginTop: 40 },
});
