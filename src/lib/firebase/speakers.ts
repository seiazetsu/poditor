import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";

import { getFirebaseFirestore } from "@/lib/firebase/firestore";
import { ScriptSpeaker } from "@/types/script";

type SpeakerDocument = {
  name?: unknown;
  color?: unknown;
  updatedAt?: unknown;
};

type CreateSpeakerInput = {
  name: string;
  color: string;
};

type UpdateSpeakerInput = {
  name: string;
  color: string;
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

const normalizeSpeakerName = (value: unknown): string => {
  return typeof value === "string" && value.trim().length > 0 ? value : "名前未設定";
};

const normalizeSpeakerColor = (value: unknown): string => {
  return typeof value === "string" && value.trim().length > 0 ? value : "#1F6FEB";
};

const getSpeakersCollection = (scriptId: string) => {
  const firestore = getFirebaseFirestore();
  return collection(firestore, "scripts", scriptId, "speakers");
};

const getProjectSpeakersCollection = (projectId: string, scriptId: string) => {
  const firestore = getFirebaseFirestore();
  return collection(firestore, "projects", projectId, "scripts", scriptId, "speakers");
};

export const fetchSpeakers = async (scriptId: string): Promise<ScriptSpeaker[]> => {
  const speakersRef = getSpeakersCollection(scriptId);
  const speakersQuery = query(speakersRef, orderBy("createdAt", "asc"));
  const snapshot = await getDocs(speakersQuery);

  return snapshot.docs.map((speakerDoc) => {
    const data = speakerDoc.data() as SpeakerDocument;
    return {
      id: speakerDoc.id,
      name: normalizeSpeakerName(data.name),
      color: normalizeSpeakerColor(data.color),
      updatedAt: toIsoDate(data.updatedAt)
    };
  });
};

export const fetchProjectSpeakers = async (
  projectId: string,
  scriptId: string
): Promise<ScriptSpeaker[]> => {
  const speakersRef = getProjectSpeakersCollection(projectId, scriptId);
  const speakersQuery = query(speakersRef, orderBy("createdAt", "asc"));
  const snapshot = await getDocs(speakersQuery);

  return snapshot.docs.map((speakerDoc) => {
    const data = speakerDoc.data() as SpeakerDocument;
    return {
      id: speakerDoc.id,
      name: normalizeSpeakerName(data.name),
      color: normalizeSpeakerColor(data.color),
      updatedAt: toIsoDate(data.updatedAt)
    };
  });
};

export const createSpeaker = async (
  scriptId: string,
  input: CreateSpeakerInput
): Promise<string> => {
  const trimmedName = input.name.trim();
  if (!trimmedName) {
    throw new Error("話者名は必須です。");
  }

  const speakersRef = getSpeakersCollection(scriptId);
  const docRef = await addDoc(speakersRef, {
    name: trimmedName,
    color: input.color,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return docRef.id;
};

export const createProjectSpeaker = async (
  projectId: string,
  scriptId: string,
  input: CreateSpeakerInput
): Promise<string> => {
  const trimmedName = input.name.trim();
  if (!trimmedName) {
    throw new Error("話者名は必須です。");
  }

  const speakersRef = getProjectSpeakersCollection(projectId, scriptId);
  const docRef = await addDoc(speakersRef, {
    name: trimmedName,
    color: input.color,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return docRef.id;
};

export const updateSpeaker = async (
  scriptId: string,
  speakerId: string,
  input: UpdateSpeakerInput
): Promise<void> => {
  const trimmedName = input.name.trim();
  if (!trimmedName) {
    throw new Error("話者名は必須です。");
  }

  const firestore = getFirebaseFirestore();
  const speakerRef = doc(firestore, "scripts", scriptId, "speakers", speakerId);

  await updateDoc(speakerRef, {
    name: trimmedName,
    color: input.color,
    updatedAt: serverTimestamp()
  });
};

export const updateProjectSpeaker = async (
  projectId: string,
  scriptId: string,
  speakerId: string,
  input: UpdateSpeakerInput
): Promise<void> => {
  const trimmedName = input.name.trim();
  if (!trimmedName) {
    throw new Error("話者名は必須です。");
  }

  const firestore = getFirebaseFirestore();
  const speakerRef = doc(firestore, "projects", projectId, "scripts", scriptId, "speakers", speakerId);

  await updateDoc(speakerRef, {
    name: trimmedName,
    color: input.color,
    updatedAt: serverTimestamp()
  });
};

export const deleteSpeaker = async (scriptId: string, speakerId: string): Promise<void> => {
  const firestore = getFirebaseFirestore();
  const speakerRef = doc(firestore, "scripts", scriptId, "speakers", speakerId);

  await deleteDoc(speakerRef);
};

export const deleteProjectSpeaker = async (
  projectId: string,
  scriptId: string,
  speakerId: string
): Promise<void> => {
  const firestore = getFirebaseFirestore();
  const speakerRef = doc(firestore, "projects", projectId, "scripts", scriptId, "speakers", speakerId);

  await deleteDoc(speakerRef);
};
