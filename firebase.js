import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyBpjRC34exuVwANJ198cI-eR_QdVYcNh4M",
  authDomain: "proconnectsports-bd115.firebaseapp.com",
  projectId: "proconnectsports-bd115",
  storageBucket: "proconnectsports-bd115.firebasestorage.app",
  messagingSenderId: "305908477935",
  appId: "1:305908477935:web:b7508c5f2618b56cd5901a"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);