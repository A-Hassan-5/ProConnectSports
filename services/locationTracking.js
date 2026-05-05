import * as Location from 'expo-location';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export async function requestLocationPermission() {
  const result = await Location.requestForegroundPermissionsAsync();
  return result.status === 'granted';
}

export async function startUserLocationTracking(uid) {
  const granted = await requestLocationPermission();
  if (!granted || !uid) {
    return null;
  }

  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 50,
      timeInterval: 15000,
    },
    async (location) => {
      try {
        await updateDoc(doc(db, 'users', uid), {
          lastLocation: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
          locationUpdatedAt: serverTimestamp(),
        });
      } catch (error) {
        console.warn('Location update failed', error);
      }
    }
  );
}
