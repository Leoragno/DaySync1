import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Configurazione Firebase caricata da variabili d'ambiente (Expo Public)
// Se le variabili mancano, usiamo valori mock per evitare crash durante il bundling
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "missing-api-key",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "missing-auth-domain",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "missing-project-id",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "missing-storage-bucket",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "missing-sender-id",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "missing-app-id",
};

const app = initializeApp(firebaseConfig);

// Inizializza Firestore.
// NOTA: La persistenza offline con il JS SDK in React Native è limitata.
// Usiamo persistentLocalCache senza tabManager (che è solo per il Web) per evitare crash.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({}),
});

// Auth (compatibile con React Native)
export const auth = getAuth(app);

export default app;
