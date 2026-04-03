import { Timestamp, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { getFirebaseFirestore } from "@/lib/firebase/firestore";

type UserDocument = {
  uid?: unknown;
  email?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type AppUser = {
  uid: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

const toIsoDate = (value: unknown): string => {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date(0).toISOString();
};

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const ensureUserProfile = async (uid: string, email: string): Promise<void> => {
  const normalizedEmail = normalizeEmail(email);
  if (!uid || !normalizedEmail) {
    return;
  }

  const firestore = getFirebaseFirestore();
  const userRef = doc(firestore, "users", normalizedEmail);
  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    const data = snapshot.data() as UserDocument;
    if (data.uid === uid && data.email === normalizedEmail) {
      return;
    }
  }

  await setDoc(
    userRef,
    {
      uid,
      email: normalizedEmail,
      createdAt: snapshot.exists() ? snapshot.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
};

export const fetchUserByEmail = async (email: string): Promise<AppUser | null> => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return null;
  }

  const firestore = getFirebaseFirestore();
  const userRef = doc(firestore, "users", normalizedEmail);
  const snapshot = await getDoc(userRef);
  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data() as UserDocument;
  return {
    uid: typeof data.uid === "string" ? data.uid : "",
    email: typeof data.email === "string" ? data.email : normalizedEmail,
    createdAt: toIsoDate(data.createdAt),
    updatedAt: toIsoDate(data.updatedAt)
  };
};
