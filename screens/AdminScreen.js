import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { collection, onSnapshot, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { DEMO_MATCHES, DEMO_USERS } from '../services/demoData';

export default function AdminScreen({ navigation }) {
  const [matches, setMatches] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('matches');
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    const unsubMatches = onSnapshot(
      query(collection(db, 'matches'), orderBy('createdAt', 'desc')),
      (snap) => {
        const mapped = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMatches(mapped.length ? mapped : DEMO_MATCHES);
        setLoading(false);
      },
      () => {
        setMatches(DEMO_MATCHES);
        setLoading(false);
      }
    );

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const mapped = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setUsers(mapped.length ? mapped : DEMO_USERS);
      },
      () => {
        setUsers(DEMO_USERS);
      }
    );

    return () => {
      unsubMatches();
      unsubUsers();
    };
  }, [isAdmin]);

  const deleteMatch = (matchId) => {
    Alert.alert('Delete Match', 'Are you sure you want to delete this match?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'matches', matchId));
          } catch (e) {
            Alert.alert('Failed', e.message);
          }
        },
      },
    ]);
  };

  const banUser = (userId, currentlyBanned) => {
    Alert.alert(
      currentlyBanned ? 'Unban User' : 'Ban User',
      currentlyBanned ? 'Allow this user back?' : 'Ban this user from the platform?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: currentlyBanned ? 'Unban' : 'Ban',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'users', userId), { banned: !currentlyBanned });
            } catch (e) {
              Alert.alert('Failed', e.message);
            }
          },
        },
      ]
    );
  };

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingBox}>
          <Text style={styles.emptyText}>Only admins can access this panel.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Admin Panel</Text>
        <View style={styles.adminBadge}>
          <Text style={styles.adminBadgeText}>ADMIN</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{matches.length}</Text>
          <Text style={styles.statLabel}>Total Matches</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{users.length}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{users.filter((u) => u.banned).length}</Text>
          <Text style={styles.statLabel}>Banned</Text>
        </View>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, activeTab === 'matches' && styles.tabActive]} onPress={() => setActiveTab('matches')}>
          <Text style={[styles.tabText, activeTab === 'matches' && styles.tabTextActive]}>Matches ({matches.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'users' && styles.tabActive]} onPress={() => setActiveTab('users')}>
          <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>Users ({users.length})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {activeTab === 'matches' ? (
          matches.length === 0 ? (
            <Text style={styles.emptyText}>No matches yet</Text>
          ) : (
            matches.map((match) => (
              <View key={match.id} style={styles.card}>
                <View style={styles.cardLeft}>
                  <View style={[styles.colorDot, { backgroundColor: match.color || '#00E676' }]} />
                  <View>
                    <Text style={styles.cardTitle}>{match.sport}</Text>
                    <Text style={styles.cardSub}>Location: {match.location}</Text>
                    <Text style={styles.cardSub}>Time: {match.time}</Text>
                    <Text style={styles.cardSub}>By: {match.createdByName || 'Unknown'}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteMatch(match.id)}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            ))
          )
        ) : users.length === 0 ? (
          <Text style={styles.emptyText}>No users yet</Text>
        ) : (
          users.map((user) => (
            <View key={user.id} style={styles.card}>
              <View style={styles.cardLeft}>
                <View style={[styles.avatar, { backgroundColor: user.banned ? '#FF4D6D' : '#00E676' }]}>
                  <Text style={styles.avatarText}>{(user.name || 'U').substring(0, 2).toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={styles.cardTitle}>{user.name || 'Unknown'}</Text>
                  <Text style={styles.cardSub}>{user.email}</Text>
                  <Text style={styles.cardSub}>{user.city || 'N/A'} - {user.role || 'player'}</Text>
                  {user.banned && <Text style={styles.bannedTag}>BANNED</Text>}
                </View>
              </View>
              <TouchableOpacity style={[styles.banBtn, user.banned && styles.unbanBtn]} onPress={() => banUser(user.id, user.banned)}>
                <Text style={styles.banBtnText}>{user.banned ? 'Unban' : 'Ban'}</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 },
  backText: { color: '#8A8AA0', fontSize: 14, lineHeight: 20 },
  title: { fontSize: 18, fontWeight: '700', color: '#F0F0F8', lineHeight: 24 },
  adminBadge: { backgroundColor: '#00E67620', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  adminBadgeText: { color: '#00E676', fontSize: 12, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 24, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: '#12121A', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#ffffff10' },
  statNum: { fontSize: 22, fontWeight: '700', color: '#00E676', lineHeight: 28 },
  statLabel: { fontSize: 11, color: '#8A8AA0', marginTop: 2, textAlign: 'center', lineHeight: 14 },
  tabRow: { flexDirection: 'row', marginHorizontal: 24, marginBottom: 16, backgroundColor: '#12121A', borderRadius: 12, padding: 4, borderWidth: 1, borderColor: '#ffffff10' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#00E676' },
  tabText: { color: '#8A8AA0', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#000' },
  list: { paddingHorizontal: 24 },
  card: { backgroundColor: '#12121A', borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#ffffff10' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  colorDot: { width: 12, height: 12, borderRadius: 6, flexShrink: 0 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#F0F0F8', marginBottom: 2, lineHeight: 20 },
  cardSub: { fontSize: 12, color: '#8A8AA0', marginBottom: 1, lineHeight: 16 },
  deleteBtn: { width: 70, height: 36, backgroundColor: '#FF4D6D20', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontSize: 11, color: '#FF4D6D', fontWeight: '700', lineHeight: 14 },
  avatar: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: 14, fontWeight: '800', color: '#000' },
  bannedTag: { color: '#FF4D6D', fontSize: 11, fontWeight: '700', marginTop: 2 },
  banBtn: { backgroundColor: '#FF4D6D20', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  unbanBtn: { backgroundColor: '#00E67620' },
  banBtnText: { color: '#FF4D6D', fontSize: 13, fontWeight: '700' },
  emptyText: { color: '#55556A', fontSize: 14, textAlign: 'center', paddingTop: 40 },
});
