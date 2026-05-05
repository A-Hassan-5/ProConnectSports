import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export async function queueNotification({
  type,
  title,
  message,
  channels = ['push', 'email'],
  userId = null,
  matchId = null,
  metadata = {},
}) {
  await addDoc(collection(db, 'notificationQueue'), {
    type,
    title,
    message,
    channels,
    userId,
    matchId,
    metadata,
    status: 'queued',
    createdAt: serverTimestamp(),
  });
}
