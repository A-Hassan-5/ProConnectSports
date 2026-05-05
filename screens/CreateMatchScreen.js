import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { queueNotification } from '../services/notifications';

const SPORTS = ['Cricket', 'Football', 'Futsal', 'Badminton', 'Padel', 'Squash', 'Basketball', 'Table Tennis'];
const SLOTS = ['2', '3', '4', '5', '6', '8', '10', '11', '22'];
const COLORS = ['#00E676', '#FF6B6B', '#4ECDC4', '#FFE66D', '#A78BFA', '#F97316', '#38BDF8', '#FB7185'];

export default function CreateMatchScreen({ navigation }) {
  const [sport, setSport] = useState('Cricket');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(null);
  const [time, setTime] = useState('');
  const [slots, setSlots] = useState('4');
  const [showSports, setShowSports] = useState(false);
  const [showSlots, setShowSlots] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const { authUser, profile, isBanned } = useAuth();

  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const formatDateLabel = (inputDate) => {
    if (!inputDate) {
      return '';
    }
    return inputDate.toLocaleDateString(undefined, {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleDateChange = (_event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleCreate = async () => {
    if (!authUser) {
      Alert.alert('Sign in required', 'Please sign in to create a match.');
      return;
    }

    if (isBanned) {
      Alert.alert('Access restricted', 'Your account is blocked from creating matches.');
      return;
    }

    if (!location || !date || !time) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }

    const pickedDate = new Date(date);
    pickedDate.setHours(0, 0, 0, 0);
    if (pickedDate < tomorrow) {
      Alert.alert('Invalid date', 'Please choose a future date for the match.');
      return;
    }

    const dateLabel = formatDateLabel(date);

    try {
      setLoading(true);
      await addDoc(collection(db, 'matches'), {
        sport,
        location: location.trim(),
        date: dateLabel,
        time: `${dateLabel} ${time.trim()}`,
        slots: parseInt(slots, 10),
        filled: 1,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        status: 'open',
        createdBy: authUser.uid,
        createdByName: profile?.name || authUser.email,
        city: profile?.city || null,
        participants: [authUser.uid],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      try {
        await queueNotification({
          type: 'match_created',
          title: `${sport} match created`,
          message: `${profile?.name || 'A player'} opened a ${sport} match at ${location.trim()}.`,
          userId: authUser.uid,
          metadata: { city: profile?.city || null },
        });
      } catch (notifyError) {
        console.warn('Notification queue failed', notifyError);
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert('Create match failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>{'< Back'}</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Create a Match</Text>
          <Text style={styles.sub}>Post a match and find players near you</Text>

          <Text style={styles.label}>Sport</Text>
          <TouchableOpacity style={styles.input} onPress={() => setShowSports(!showSports)}>
            <Text style={styles.inputText}>{sport}</Text>
          </TouchableOpacity>
          {showSports && (
            <View style={styles.dropdown}>
              {SPORTS.map((s) => (
                <TouchableOpacity key={s} style={styles.dropdownItem} onPress={() => { setSport(s); setShowSports(false); }}>
                  <Text style={[styles.dropdownText, s === sport && styles.dropdownTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>Location / Ground</Text>
          <TextInput
            style={styles.inputField}
            placeholder="e.g. F-7 Ground, Islamabad"
            placeholderTextColor="#55556A"
            value={location}
            onChangeText={setLocation}
          />

          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.label}>Date</Text>
              <TouchableOpacity style={styles.inputField} onPress={() => setShowDatePicker(true)}>
                <Text style={[styles.inputText, !date && styles.placeholderText]}>{date ? formatDateLabel(date) : 'Choose a future date'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.half}>
              <Text style={styles.label}>Time</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. 5:00 PM"
                placeholderTextColor="#55556A"
                value={time}
                onChangeText={setTime}
              />
            </View>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={date || tomorrow}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={tomorrow}
              onChange={handleDateChange}
            />
          )}

          {showDatePicker && Platform.OS === 'ios' && (
            <TouchableOpacity style={styles.dateDoneBtn} onPress={() => setShowDatePicker(false)}>
              <Text style={styles.dateDoneText}>Done</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.label}>Players needed</Text>
          <TouchableOpacity style={styles.input} onPress={() => setShowSlots(!showSlots)}>
            <Text style={styles.inputText}>{slots} players</Text>
          </TouchableOpacity>
          {showSlots && (
            <View style={styles.dropdown}>
              {SLOTS.map((s) => (
                <TouchableOpacity key={s} style={styles.dropdownItem} onPress={() => { setSlots(s); setShowSlots(false); }}>
                  <Text style={[styles.dropdownText, s === slots && styles.dropdownTextActive]}>{s} players</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.btnPrimary} onPress={handleCreate} disabled={loading}>
            {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnPrimaryText}>Post Match</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnSecondary} onPress={() => navigation.goBack()}>
            <Text style={styles.btnSecondaryText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  inner: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
  back: { marginBottom: 28 },
  backText: { color: '#8A8AA0', fontSize: 14, lineHeight: 20 },
  title: { fontSize: 28, fontWeight: '700', color: '#F0F0F8', marginBottom: 6, lineHeight: 34 },
  sub: { fontSize: 14, color: '#8A8AA0', marginBottom: 32, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#8A8AA0', marginBottom: 8, lineHeight: 18 },
  input: {
    backgroundColor: '#1A1A25', borderWidth: 1, borderColor: '#ffffff15',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    marginBottom: 16, justifyContent: 'center',
  },
  inputText: { color: '#F0F0F8', fontSize: 15, lineHeight: 20, fontWeight: '500' },
  placeholderText: { color: '#55556A', fontWeight: '400' },
  inputField: {
    backgroundColor: '#1A1A25', borderWidth: 1, borderColor: '#ffffff15',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    color: '#F0F0F8', fontSize: 15, marginBottom: 16,
  },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  dropdown: {
    backgroundColor: '#1A1A25', borderWidth: 1, borderColor: '#ffffff20',
    borderRadius: 12, marginTop: -10, marginBottom: 16, overflow: 'hidden',
  },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#ffffff10' },
  dropdownText: { color: '#F0F0F8', fontSize: 15, lineHeight: 20 },
  dropdownTextActive: { color: '#00E676', fontWeight: '700' },
  dateDoneBtn: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    marginTop: -6,
    backgroundColor: '#1A1A25',
    borderColor: '#ffffff15',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dateDoneText: { color: '#00E676', fontSize: 13, fontWeight: '600' },
  btnPrimary: {
    backgroundColor: '#00E676', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  btnPrimaryText: { color: '#000', fontSize: 16, fontWeight: '700', lineHeight: 22 },
  btnSecondary: {
    backgroundColor: '#1A1A25', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginTop: 12,
    borderWidth: 1, borderColor: '#ffffff15',
  },
  btnSecondaryText: { color: '#F0F0F8', fontSize: 15, fontWeight: '500', lineHeight: 20 },
});
