import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, Modal, FlatList, ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const MENU_ITEMS = [
  { label: 'Edit Profile' },
  { label: 'Notifications' },
  { label: 'Privacy and Security' },
  { label: 'Help and Support' },
];

const AVAILABILITY_SLOTS = [
  'Monday 6pm', 'Monday 8pm',
  'Tuesday 6pm', 'Tuesday 8pm',
  'Wednesday 6pm', 'Wednesday 8pm',
  'Thursday 6pm', 'Thursday 8pm',
  'Friday 4pm', 'Friday 6pm', 'Friday 8pm',
  'Saturday 9am', 'Saturday 12pm', 'Saturday 4pm', 'Saturday 8pm',
  'Sunday 9am', 'Sunday 12pm', 'Sunday 4pm', 'Sunday 8pm',
];

export default function ProfileScreen({ navigation }) {
  const { authUser, profile, isAdmin } = useAuth();
  const showDemoProfile = !authUser && !profile;

  const user = {
    name: profile?.name || (showDemoProfile ? 'Demo Player' : 'Guest User'),
    email: profile?.email || authUser?.email || 'guest@local',
    sports: profile?.sports || (showDemoProfile ? ['Padel', 'Football'] : []),
    matches: profile?.matchesPlayed || (showDemoProfile ? 12 : 0),
    wins: profile?.wins || (showDemoProfile ? 5 : 0),
    role: profile?.role || (showDemoProfile ? 'user' : 'guest'),
    governmentIdMasked: profile?.governmentIdMasked || (showDemoProfile ? '****8841' : 'N/A'),
  };

  const [availabilityModalVisible, setAvailabilityModalVisible] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState(profile?.availability || []);
  const [savingAvailability, setSavingAvailability] = useState(false);

  const toggleSlot = (slot) => {
    setSelectedSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  };

  const saveAvailability = async () => {
    if (!authUser) return;
    try {
      setSavingAvailability(true);
      await updateDoc(doc(db, 'users', authUser.uid), {
        availability: selectedSlots,
        updatedAt: serverTimestamp(),
      });
      setAvailabilityModalVisible(false);
      Alert.alert('Saved', 'Your availability has been updated.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingAvailability(false);
    }
  };

  const handleSignOut = async () => {
    if (!authUser) {
      navigation.reset({ index: 0, routes: [{ name: 'Splash' }] });
      return;
    }
    try {
      await signOut(auth);
    } catch (error) {
      Alert.alert('Sign out failed', error.message);
    }
  };

  const handleMenuPress = (label) => {
    Alert.alert(label, 'This section is enabled for MVP demo and can be expanded later.');
  };

  const locationInfo = profile?.lastLocation
    ? `${profile.lastLocation.latitude.toFixed(4)}, ${profile.lastLocation.longitude.toFixed(4)}`
    : 'Not available';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.avatarBox}>
          <Text style={styles.avatarText}>{user.name.substring(0, 2).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <Text style={styles.role}>Role: {user.role}</Text>

        {!!user.sports.length && (
          <View style={styles.sportsRow}>
            {user.sports.map((s) => (
              <View key={s} style={styles.sportTag}>
                <Text style={styles.sportTagText}>{s}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{user.matches}</Text>
            <Text style={styles.statLabel}>Matches</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{user.wins}</Text>
            <Text style={styles.statLabel}>Wins</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{user.sports.length}</Text>
            <Text style={styles.statLabel}>Sports</Text>
          </View>
        </View>

        <View style={styles.idCard}>
          <Text style={styles.idTitle}>Government ID (masked)</Text>
          <Text style={styles.idValue}>{user.governmentIdMasked}</Text>
        </View>

        <View style={styles.idCard}>
          <Text style={styles.idTitle}>Last GPS Location</Text>
          <Text style={styles.idValue}>{locationInfo}</Text>
        </View>

        {/* ── Availability Section ── */}
        {authUser && (
          <>
            <View style={styles.idCard}>
              <Text style={styles.idTitle}>My Availability</Text>
              <Text style={styles.idValue}>
                {selectedSlots.length > 0
                  ? selectedSlots.join(', ')
                  : 'Not set yet'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.availabilityBtn}
              onPress={() => setAvailabilityModalVisible(true)}
              testID="set-availability-btn"
            >
              <Text style={styles.availabilityBtnText}>
                {selectedSlots.length > 0
                  ? `Edit Availability (${selectedSlots.length} slots)`
                  : 'Set My Availability'}
              </Text>
            </TouchableOpacity>

            <Modal
              visible={availabilityModalVisible}
              animationType="slide"
              transparent
              onRequestClose={() => setAvailabilityModalVisible(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalBox}>
                  <Text style={styles.modalTitle}>When are you free?</Text>
                  <Text style={styles.modalSub}>Tap the slots that work for you</Text>
                  <FlatList
                    data={AVAILABILITY_SLOTS}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => {
                      const active = selectedSlots.includes(item);
                      return (
                        <TouchableOpacity
                          style={[styles.slotRow, active && styles.slotRowActive]}
                          onPress={() => toggleSlot(item)}
                        >
                          <Text style={[styles.slotText, active && styles.slotTextActive]}>
                            {item}
                          </Text>
                          {active && <Text style={styles.slotCheck}>✓</Text>}
                        </TouchableOpacity>
                      );
                    }}
                    style={{ maxHeight: 340 }}
                  />
                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={saveAvailability}
                    disabled={savingAvailability}
                  >
                    {savingAvailability
                      ? <ActivityIndicator color="#000" />
                      : <Text style={styles.saveBtnText}>Save Availability</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setAvailabilityModalVisible(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </>
        )}

        <View style={styles.menuSection}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.menuItem}
              onPress={() => handleMenuPress(item.label)}
            >
              <View style={styles.menuLeft}>
                <View style={styles.menuIcon} />
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <Text style={styles.menuArrow}>{'>'}</Text>
            </TouchableOpacity>
          ))}

          {isAdmin && (
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Admin')}>
              <View style={styles.menuLeft}>
                <View style={[styles.menuIcon, { backgroundColor: '#00E67620' }]} />
                <Text style={[styles.menuLabel, { color: '#00E676' }]}>Admin Panel</Text>
              </View>
              <Text style={[styles.menuArrow, { color: '#00E676' }]}>{'>'}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#FF4D6D20' }]} />
              <Text style={[styles.menuLabel, { color: '#FF4D6D' }]}>
                {authUser ? 'Sign Out' : 'Exit Guest Mode'}
              </Text>
            </View>
            <Text style={[styles.menuArrow, { color: '#FF4D6D' }]}>{'>'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>ProConnect Sports v1.1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  inner: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40, alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: '#F0F0F8', alignSelf: 'flex-start', marginBottom: 24 },
  avatarBox: { width: 84, height: 84, backgroundColor: '#00E676', borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#000' },
  name: { fontSize: 22, fontWeight: '800', color: '#F0F0F8', marginBottom: 4 },
  email: { fontSize: 14, color: '#8A8AA0', marginBottom: 4 },
  role: { fontSize: 13, color: '#00E676', marginBottom: 14 },
  sportsRow: { flexDirection: 'row', gap: 8, marginBottom: 24, flexWrap: 'wrap', justifyContent: 'center' },
  sportTag: { backgroundColor: '#00E67620', borderWidth: 1, borderColor: '#00E67640', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  sportTagText: { color: '#00E676', fontSize: 13, fontWeight: '500' },
  statsRow: { flexDirection: 'row', gap: 12, width: '100%', marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: '#1A1A25', borderRadius: 14, padding: 16, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '800', color: '#00E676' },
  statLabel: { fontSize: 12, color: '#8A8AA0', marginTop: 2 },
  idCard: { width: '100%', backgroundColor: '#12121A', borderWidth: 1, borderColor: '#ffffff10', borderRadius: 14, padding: 14, marginBottom: 12 },
  idTitle: { color: '#8A8AA0', fontSize: 12, marginBottom: 4 },
  idValue: { color: '#F0F0F8', fontSize: 14, fontWeight: '700' },
  availabilityBtn: { width: '100%', backgroundColor: '#1A1A25', borderWidth: 1, borderColor: '#00E67640', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 20 },
  availabilityBtnText: { color: '#00E676', fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: '#00000099', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#12121A', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { color: '#F0F0F8', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  modalSub: { color: '#8A8AA0', fontSize: 13, marginBottom: 16 },
  slotRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, marginBottom: 6, backgroundColor: '#1A1A25' },
  slotRowActive: { backgroundColor: '#00E67215', borderWidth: 1, borderColor: '#00E676' },
  slotText: { color: '#8A8AA0', fontSize: 14 },
  slotTextActive: { color: '#00E676', fontWeight: '600' },
  slotCheck: { color: '#00E676', fontWeight: '700', fontSize: 16 },
  saveBtn: { backgroundColor: '#00E676', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#000', fontSize: 15, fontWeight: '700' },
  cancelBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 10 },
  cancelBtnText: { color: '#8A8AA0', fontSize: 14 },
  menuSection: { width: '100%', backgroundColor: '#12121A', borderRadius: 16, borderWidth: 1, borderColor: '#ffffff10', overflow: 'hidden', marginBottom: 24 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#ffffff08' },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIcon: { width: 36, height: 36, backgroundColor: '#1A1A25', borderRadius: 10 },
  menuLabel: { fontSize: 15, color: '#F0F0F8' },
  menuArrow: { fontSize: 16, color: '#55556A' },
  version: { fontSize: 12, color: '#55556A' },
});
