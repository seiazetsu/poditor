import { FirebaseApp, FirebaseOptions, getApps, initializeApp } from "firebase/app";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const requiredEnvValues = [
  { key: "NEXT_PUBLIC_FIREBASE_API_KEY", value: firebaseConfig.apiKey },
  { key: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", value: firebaseConfig.authDomain },
  { key: "NEXT_PUBLIC_FIREBASE_PROJECT_ID", value: firebaseConfig.projectId },
  { key: "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", value: firebaseConfig.storageBucket },
  {
    key: "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    value: firebaseConfig.messagingSenderId
  },
  { key: "NEXT_PUBLIC_FIREBASE_APP_ID", value: firebaseConfig.appId }
] as const;

let firebaseApp: FirebaseApp | null = null;

export const hasFirebaseConfig = (): boolean => {
  return requiredEnvValues.every((entry) => Boolean(entry.value));
};

export const getFirebaseApp = (): FirebaseApp => {
  if (firebaseApp) {
    return firebaseApp;
  }

  if (!hasFirebaseConfig()) {
    const missing = requiredEnvValues.find((entry) => !entry.value);
    const missingKey = missing?.key ?? "NEXT_PUBLIC_FIREBASE_*";
    throw new Error(`Missing Firebase environment variable: ${missingKey}`);
  }

  firebaseApp = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  return firebaseApp;
};
