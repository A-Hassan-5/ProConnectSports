import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }

    try {
      setLoading(true);
      const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const userSnap = await getDoc(doc(db, 'users', credential.user.uid));
      if (userSnap.exists() && userSnap.data().banned) {
        await signOut(auth);
        Alert.alert('Account blocked', 'Your account has been blocked. Please contact support.');
      }
    } catch (error) {
      Alert.alert('Sign in failed', error.message);
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

          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.sub}>Sign in to find your next match</Text>

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
            placeholder="********"
            placeholderTextColor="#55556A"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.btnPrimary} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnPrimaryText}>Sign In</Text>}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue as</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.btnSecondary} onPress={() => navigation.replace('Main')}>
            <Text style={styles.btnSecondaryText}>Guest (Browse only)</Text>
          </TouchableOpacity>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.switchLink}>Sign Up</Text>
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
    color: '#F0F0F8', fontSize: 15, marginBottom: 16,
  },
  btnPrimary: {
    backgroundColor: '#00E676', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  btnPrimaryText: { color: '#000', fontSize: 16, fontWeight: '800' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 24, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#ffffff15' },
  dividerText: { color: '#55556A', fontSize: 13 },
  btnSecondary: {
    backgroundColor: '#1A1A25', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
    borderWidth: 1, borderColor: '#ffffff15',
  },
  btnSecondaryText: { color: '#F0F0F8', fontSize: 15, fontWeight: '500' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  switchText: { color: '#8A8AA0', fontSize: 14 },
  switchLink: { color: '#00E676', fontSize: 14, fontWeight: '500' },
});
