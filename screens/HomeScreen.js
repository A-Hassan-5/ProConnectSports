import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, FlatList, Alert } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { startUserLocationTracking } from '../services/locationTracking';
import { queueNotification } from '../services/notifications';
import { DEMO_MATCHES } from '../services/demoData';

const SPORTS = ['All', 'Cricket', 'Football', 'Futsal', 'Badminton', 'Padel', 'Squash', 'Basketball', 'Table Tennis'];

function MatchCard({ match, onJoin, joined, disabled }) {
  const badgeStyle = {
    open: { bg: '#00E67620', text: '#00E676', label: 'Open' },
    soon: { bg: '#FFB70020', text: '#FFB700', label: 'Filling Fast' },
    full: { bg: '#FF4D6D20', text: '#FF4D6D', label: 'Full' },
  }[match.status || 'open'];

  const avatarColors = ['#00E676', '#FF6B6B', '#4ECDC4', '#FFE66D', '#A78BFA'];

  return (
    <View style={styles.card}>
      <View style={[styles.cardAccent, { backgroundColor: match.color || '#00E676' }]} />
      <View style={styles.cardInner}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardSport}>{match.sport}</Text>
          <View style={[styles.badge, { backgroundColor: badgeStyle.bg }]}>
            <Text style={[styles.badgeText, { color: badgeStyle.text }]}>{badgeStyle.label}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Location: {match.location}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Time: {match.time}</Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.avatarsRow}>
            {Array(Math.min(match.filled || 0, 4))
              .fill(0)
              .map((_, i) => (
                <View key={i} style={[styles.avatar, { backgroundColor: avatarColors[i % 5], marginLeft: i === 0 ? 0 : -8 }]}>
                  <Text style={styles.avatarText}>{['MA', 'SF', 'ZK', 'AR', 'NF'][i]}</Text>
                </View>
              ))}
            {(match.slots || 0) > 0 && <Text style={styles.slotsText}>+{match.slots} spots</Text>}
          </View>

          {match.status === 'full' ? (
            <View style={styles.btnFull}>
              <Text style={styles.btnFullText}>Full</Text>
            </View>
          ) : joined ? (
            <View style={styles.btnJoined}>
              <Text style={styles.btnJoinedText}>Joined</Text>
            </View>
          ) : (
            <TouchableOpacity style={[styles.btnJoin, disabled && { opacity: 0.5 }]} onPress={() => onJoin(match.id)} disabled={disabled}>
              <Text style={styles.btnJoinText}>Join</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [matches, setMatches] = useState([]);
  const [joinedMatches, setJoinedMatches] = useState(new Set());
  const [gpsTrackingEnabled, setGpsTrackingEnabled] = useState(false);
  const { authUser, profile, isBanned } = useAuth();

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'matches'), orderBy('createdAt', 'desc')),
      (snap) => {
        const mapped = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMatches(mapped.length ? mapped : DEMO_MATCHES);
      },
      () => {
        setMatches(DEMO_MATCHES);
      }
    );

    return () => unsub();
  }, []);

  useEffect(() => {
    let subscription = null;

    const start = async () => {
      if (!authUser) {
        setGpsTrackingEnabled(false);
        return;
      }
      subscription = await startUserLocationTracking(authUser.uid);
      setGpsTrackingEnabled(!!subscription);
    };

    start();

    return () => {
      if (subscription) {
        subscription.remove();
      }
      setGpsTrackingEnabled(false);
    };
  }, [authUser]);

  const filtered = useMemo(
    () => (activeFilter === 'All' ? matches : matches.filter((m) => m.sport === activeFilter)),
    [activeFilter, matches]
  );

  const applyLocalJoinUpdate = (id) => {
    setMatches((prev) =>
      prev.map((m) => {
        if (m.id !== id) {
          return m;
        }

        const remaining = m.slots || 0;
        if (remaining <= 0) {
          return { ...m, status: 'full' };
        }

        const nextSlots = remaining - 1;
        return {
          ...m,
          slots: nextSlots,
          filled: (m.filled || 0) + 1,
          status: nextSlots === 0 ? 'full' : m.status || 'open',
        };
      })
    );
    setJoinedMatches((prev) => new Set([...prev, id]));
  };

  const handleJoin = async (id) => {
    if (!authUser) {
      Alert.alert('Sign in required', 'Please sign in to join matches.');
      return;
    }

    if (isBanned) {
      Alert.alert('Access restricted', 'Your account is blocked from joining matches.');
      return;
    }

    if (id.startsWith('demo-')) {
      applyLocalJoinUpdate(id);
      return;
    }

    try {
      let matchForNotification = null;

      await runTransaction(db, async (transaction) => {
        const matchRef = doc(db, 'matches', id);
        const userRef = doc(db, 'users', authUser.uid);
        const snap = await transaction.get(matchRef);
        if (!snap.exists()) {
          throw new Error('Match not found');
        }
        const data = snap.data();
        matchForNotification = data;
        const remainingSlots = data.slots || 0;
        const participants = Array.isArray(data.participants) ? data.participants : [];

        if (participants.includes(authUser.uid)) {
          throw new Error('You already joined this match.');
        }

        if (remainingSlots <= 0) {
          throw new Error('No slots left in this match.');
        }

        const nextSlots = remainingSlots - 1;
        const nextFilled = (data.filled || 0) + 1;

        transaction.update(matchRef, {
          slots: nextSlots,
          filled: nextFilled,
          participants: [...participants, authUser.uid],
          status: nextSlots === 0 ? 'full' : data.status || 'open',
          updatedAt: serverTimestamp(),
        });

        transaction.set(userRef, {
          matchesPlayed: (profile?.matchesPlayed || 0) + 1,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      });

      try {
        await queueNotification({
          type: 'match_joined',
          title: 'Player joined match',
          message: `${profile?.name || 'A player'} joined ${matchForNotification?.sport || 'a'} match at ${matchForNotification?.location || 'the selected location'}.`,
          userId: authUser.uid,
          matchId: id,
        });
      } catch (notifyError) {
        console.warn('Notification queue failed', notifyError);
      }

      setJoinedMatches((prev) => new Set([...prev, id]));
    } catch (error) {
      if (error.message === 'Match not found') {
        applyLocalJoinUpdate(id);
        return;
      }
      Alert.alert('Join failed', error.message);
    }
  };

  const displayName = profile?.name || 'Guest User';

  const handleNotificationsPress = () => {
    navigation.navigate('Notifications');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good evening,</Text>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.gpsStatus}>{gpsTrackingEnabled ? 'GPS: Active' : 'GPS: Not active'}</Text>
        </View>
        <TouchableOpacity style={styles.notifBtn} onPress={handleNotificationsPress}>
          <Text style={styles.notifText}>Alerts</Text>
          <View style={styles.notifDot} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterInner}>
        {SPORTS.map((sport) => (
          <TouchableOpacity
            key={sport}
            style={[styles.filterPill, activeFilter === sport && styles.filterPillActive]}
            onPress={() => setActiveFilter(sport)}
          >
            <Text style={[styles.filterText, activeFilter === sport && styles.filterTextActive]}>{sport}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Open Matches</Text>
        <Text style={styles.sectionCount}>{filtered.length} available</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MatchCard match={item} onJoin={handleJoin} joined={joinedMatches.has(item.id)} disabled={!authUser} />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No {activeFilter} matches right now. Be the first to create one.</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, !authUser && { opacity: 0.5 }]}
        onPress={() => {
          if (!authUser) {
            Alert.alert('Sign in required', 'Please sign in to create matches.');
            return;
          }
          if (isBanned) {
            Alert.alert('Access restricted', 'Your account is blocked from creating matches.');
            return;
          }
          navigation.navigate('CreateMatch');
        }}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  greeting: { fontSize: 13, color: '#8A8AA0', lineHeight: 18 },
  name: { fontSize: 22, fontWeight: '700', color: '#F0F0F8', lineHeight: 28 },
  gpsStatus: { fontSize: 12, color: '#8A8AA0', marginTop: 2, lineHeight: 16 },
  notifBtn: { width: 60, height: 44, backgroundColor: '#1A1A25', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ffffff15', position: 'relative' },
  notifText: { fontSize: 12, color: '#F0F0F8', fontWeight: '600', lineHeight: 16 },
  notifDot: { width: 8, height: 8, backgroundColor: '#FF4D6D', borderRadius: 4, position: 'absolute', top: 8, right: 8, borderWidth: 2, borderColor: '#0A0A0F' },
  filterScroll: { paddingBottom: 12 },
  filterInner: { paddingHorizontal: 24, gap: 8, paddingBottom: 4 },
  filterPill: { backgroundColor: '#1A1A25', borderWidth: 1, borderColor: '#ffffff15', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, minWidth: 84, alignItems: 'center' },
  filterPillActive: { backgroundColor: '#00E676', borderColor: '#00E676' },
  filterText: { color: '#8A8AA0', fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#000' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#F0F0F8', lineHeight: 22 },
  sectionCount: { fontSize: 13, color: '#00E676', lineHeight: 18 },
  list: { paddingHorizontal: 24, paddingBottom: 100 },
  card: { backgroundColor: '#12121A', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#ffffff10', flexDirection: 'row', overflow: 'hidden' },
  cardAccent: { width: 4 },
  cardInner: { flex: 1, padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardSport: { fontSize: 17, fontWeight: '700', color: '#F0F0F8', lineHeight: 22 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  metaRow: { marginBottom: 5 },
  metaText: { fontSize: 13, color: '#8A8AA0', lineHeight: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  avatarsRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#12121A' },
  avatarText: { fontSize: 9, fontWeight: '700', color: '#000' },
  slotsText: { fontSize: 12, color: '#8A8AA0', marginLeft: 8 },
  btnJoin: { backgroundColor: '#00E676', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 8 },
  btnJoinText: { color: '#000', fontSize: 13, fontWeight: '700', lineHeight: 18 },
  btnJoined: { backgroundColor: '#1A1A25', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 8 },
  btnJoinedText: { color: '#8A8AA0', fontSize: 13, fontWeight: '600' },
  btnFull: { backgroundColor: '#1A1A25', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 8 },
  btnFullText: { color: '#FF4D6D', fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#55556A', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  fab: { position: 'absolute', bottom: 90, right: 24, width: 56, height: 56, backgroundColor: '#00E676', borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#00E676', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  fabText: { fontSize: 28, fontWeight: '300', color: '#000', marginTop: -2 },
});
