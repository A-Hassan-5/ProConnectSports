import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { maskGovernmentId, validateGovernmentId } from '../services/privacy';

const SPORTS = ['Cricket', 'Football', 'Futsal', 'Badminton', 'Padel', 'Squash', 'Basketball', 'Table Tennis'];
const CITIES = ['Islamabad', 'Rawalpindi', 'Lahore', 'Karachi', 'Peshawar', 'Faisalabad'];
const ADMIN_EMAILS = ['admin@proconnect.local'];

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState('');
  const [governmentId, setGovernmentId] = useState('');
  const [selectedSports, setSelectedSports] = useState([]);
  const [showCities, setShowCities] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleSport = (sport) => {
    setSelectedSports((prev) => (prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]));
  };

  const handleRegister = async () => {
    if (!name || !email || !password || !city || !governmentId) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Weak password', 'Password should be at least 8 characters long.');
      return;
    }

    if (selectedSports.length === 0) {
      Alert.alert('Missing sports', 'Please select at least one sport.');
      return;
    }

    if (!validateGovernmentId(governmentId)) {
      Alert.alert('Invalid government ID', 'Use an ID with 8-20 alphanumeric characters.');
      return;
    }

    try {
      setLoading(true);
      const credential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const normalizedEmail = email.trim().toLowerCase();
      await setDoc(doc(db, 'users', credential.user.uid), {
        uid: credential.user.uid,
        name: name.trim(),
        email: normalizedEmail,
        city,
        sports: selectedSports,
        role: ADMIN_EMAILS.includes(normalizedEmail) ? 'admin' : 'user',
        banned: false,
        governmentIdMasked: maskGovernmentId(governmentId),
        matchesPlayed: 0,
        wins: 0,
        availability: [],          // ← ADDED: stores the player's weekly availability slots
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      Alert.alert('Registration failed', error.message);
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

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.sub}>Join thousands of players across Pakistan</Text>

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Muhammad Ali"
            placeholderTextColor="#55556A"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="ali@gmail.com"
            placeholderTextColor="#55556A"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Min. 8 characters"
            placeholderTextColor="#55556A"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text style={styles.label}>Government ID</Text>
          <TextInput
            style={styles.input}
            placeholder="CNIC / Passport Number"
            placeholderTextColor="#55556A"
            value={governmentId}
            onChangeText={setGovernmentId}
            autoCapitalize="characters"
          />

          <Text style={styles.label}>City</Text>
          <TouchableOpacity style={styles.input} onPress={() => setShowCities(!showCities)}>
            <Text style={{ color: city ? '#F0F0F8' : '#55556A', fontSize: 15 }}>{city || 'Select your city'}</Text>
          </TouchableOpacity>
          {showCities && (
            <View style={styles.dropdown}>
              {CITIES.map((c) => (
                <TouchableOpacity key={c} style={styles.dropdownItem} onPress={() => { setCity(c); setShowCities(false); }}>
                  <Text style={styles.dropdownText}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>Sports you play</Text>
          <View style={styles.chipsWrap}>
            {SPORTS.map((sport) => (
              <TouchableOpacity
                key={sport}
                style={[styles.chip, selectedSports.includes(sport) && styles.chipActive]}
                onPress={() => toggleSport(sport)}
              >
                <Text style={[styles.chipText, selectedSports.includes(sport) && styles.chipTextActive]}>{sport}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.privacyText}>
            We only store a masked government ID in the app database. Use backend encryption for raw document storage.
          </Text>

          <TouchableOpacity style={styles.btnPrimary} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnPrimaryText}>Create Account</Text>}
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.switchLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  inner: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
  back: { marginBottom: 28 },
  backText: { color: '#8A8AA0', fontSize: 14 },
  title: { fontSize: 28, fontWeight: '800', color: '#F0F0F8', marginBottom: 6 },
  sub: { fontSize: 14, color: '#8A8AA0', marginBottom: 32 },
  label: { fontSize: 13, fontWeight: '500', color: '#8A8AA0', marginBottom: 8 },
  input: {
    backgroundColor: '#1A1A25', borderWidth: 1, borderColor: '#ffffff15',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    color: '#F0F0F8', fontSize: 15, marginBottom: 16, justifyContent: 'center',
  },
  dropdown: {
    backgroundColor: '#1A1A25', borderWidth: 1, borderColor: '#ffffff20',
    borderRadius: 12, marginTop: -10, marginBottom: 16, overflow: 'hidden',
  },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#ffffff10' },
  dropdownText: { color: '#F0F0F8', fontSize: 15 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  chip: {
    borderWidth: 1, borderColor: '#ffffff15', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#1A1A25',
  },
  chipActive: { backgroundColor: '#00E67620', borderColor: '#00E676' },
  chipText: { color: '#8A8AA0', fontSize: 13 },
  chipTextActive: { color: '#00E676' },
  privacyText: { color: '#8A8AA0', fontSize: 12, lineHeight: 18, marginBottom: 16 },
  btnPrimary: {
    backgroundColor: '#00E676', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  btnPrimaryText: { color: '#000', fontSize: 16, fontWeight: '800' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  switchText: { color: '#8A8AA0', fontSize: 14 },
  switchLink: { color: '#00E676', fontSize: 14, fontWeight: '500' },
});
