import { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View, FlatList } from 'react-native';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { DEMO_NOTIFICATIONS } from '../services/demoData';

function NotificationCard({ item }) {
  const statusColor = item.status === 'sent' ? '#00E676' : '#FFB700';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={[styles.status, { color: statusColor }]}>{(item.status || 'queued').toUpperCase()}</Text>
      </View>
      <Text style={styles.message}>{item.message}</Text>
      <Text style={styles.channels}>Channels: {(item.channels || ['push']).join(' + ')}</Text>
    </View>
  );
}

export default function NotificationsScreen({ navigation }) {
  const [items, setItems] = useState(DEMO_NOTIFICATIONS);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'notificationQueue'), orderBy('createdAt', 'desc'), limit(20)),
      (snap) => {
        const mapped = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setItems(mapped.length ? mapped : DEMO_NOTIFICATIONS);
      },
      () => {
        setItems(DEMO_NOTIFICATIONS);
      }
    );

    return () => unsub();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item, index) => item.id || `notif-${index}`}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <NotificationCard item={item} />}
        ListEmptyComponent={<Text style={styles.empty}>No notifications yet</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: { color: '#8A8AA0', fontSize: 14 },
  headerTitle: { color: '#F0F0F8', fontSize: 18, fontWeight: '800' },
  list: { paddingHorizontal: 24, paddingBottom: 30 },
  card: {
    backgroundColor: '#12121A',
    borderColor: '#ffffff10',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  title: { color: '#F0F0F8', fontSize: 15, fontWeight: '700', flex: 1, paddingRight: 8 },
  status: { fontSize: 11, fontWeight: '700' },
  message: { color: '#8A8AA0', fontSize: 13, lineHeight: 19 },
  channels: { color: '#55556A', fontSize: 12, marginTop: 8 },
  empty: { color: '#55556A', textAlign: 'center', marginTop: 40 },
});
