import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';

export default function SplashScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.logoBox}>
          <Text style={styles.logoIcon}>⚽</Text>
        </View>
        <Text style={styles.title}>ProConnect{'\n'}<Text style={styles.green}>Sports</Text></Text>
        <Text style={styles.sub}>Find players, create matches,{'\n'}dominate the field.</Text>

        <View style={styles.buttons}>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.btnPrimaryText}>Get Started</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.btnSecondaryText}>Sign In</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}></Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  logoBox: {
    width: 88, height: 88, backgroundColor: '#00E676',
    borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 28,
  },
  logoIcon: { fontSize: 44 },
  title: { fontSize: 38, fontWeight: '800', color: '#F0F0F8', textAlign: 'center', lineHeight: 44, marginBottom: 14 },
  green: { color: '#00E676' },
  sub: { fontSize: 16, color: '#8A8AA0', textAlign: 'center', lineHeight: 24, marginBottom: 48 },
  buttons: { width: '100%', gap: 12 },
  btnPrimary: {
    backgroundColor: '#00E676', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  btnPrimaryText: { color: '#000', fontSize: 16, fontWeight: '800' },
  btnSecondary: {
    backgroundColor: '#1A1A25', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
    borderWidth: 1, borderColor: '#ffffff15',
  },
  btnSecondaryText: { color: '#F0F0F8', fontSize: 15, fontWeight: '500' },
  footer: { color: '#55556A', fontSize: 12, marginTop: 40 },
});