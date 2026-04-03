import {
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
  Timestamp,
  collection,
  getDocs,
  query,
  updateDoc,
  writeBatch,
  where
} from "firebase/firestore";

import { getFirebaseFirestore } from "@/lib/firebase/firestore";
import { ScriptDetail, ScriptReference, ScriptStatus, ScriptSummary } from "@/types/script";

type ScriptDocument = {
  ownerUid?: unknown;
  sortOrder?: unknown;
  title?: unknown;
  status?: unknown;
  references?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type CreateScriptInput = {
  ownerUid: string;
  title: string;
};

type CreateProjectScriptInput = {
  title: string;
};

type UpdateScriptTitleInput = {
  title: string;
};

type UpdateProjectScriptStatusInput = {
  status: ScriptStatus;
};

type UpdateProjectScriptReferencesInput = {
  references: ScriptReference[];
};

type ReorderScriptsInput = {
  id: string;
  sortOrder: number;
}[];

const getProjectScriptsCollection = (projectId: string) => {
  const firestore = getFirebaseFirestore();
  return collection(firestore, "projects", projectId, "scripts");
};

const toUpdatedAtIso = (value: unknown): string => {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return new Date(0).toISOString();
};

const normalizeSortOrder = (value: unknown, fallback: number): number => {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const toScriptStatus = (value: unknown): ScriptStatus => {
  if (value === "completed" || value === "recorded") {
    return value;
  }

  return "draft";
};

const toScriptReferences = (value: unknown): ScriptReference[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const candidate = entry as Record<string, unknown>;
    const id = typeof candidate.id === "string" ? candidate.id : "";
    const text = typeof candidate.text === "string" ? candidate.text : "";
    const url = typeof candidate.url === "string" ? candidate.url : "";

    if (!id) {
      return [];
    }

    return [{ id, text, url }];
  });
};

export const fetchScriptsByOwnerUid = async (ownerUid: string): Promise<ScriptSummary[]> => {
  const firestore = getFirebaseFirestore();
  const scriptsRef = collection(firestore, "scripts");
  const scriptsQuery = query(scriptsRef, where("ownerUid", "==", ownerUid));
  const snapshot = await getDocs(scriptsQuery);

  return snapshot.docs
    .map((doc) => {
      const data = doc.data() as ScriptDocument;
      const title =
        typeof data.title === "string" && data.title.trim().length > 0 ? data.title : "無題";

      return {
        id: doc.id,
        status: toScriptStatus(data.status),
        sortOrder: normalizeSortOrder(data.sortOrder, Number.MAX_SAFE_INTEGER),
        title,
        updatedAt: toUpdatedAtIso(data.updatedAt)
      };
    })
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
};

export const createScript = async ({ ownerUid, title }: CreateScriptInput): Promise<string> => {
  const firestore = getFirebaseFirestore();
  const scriptsRef = collection(firestore, "scripts");
  const trimmedTitle = title.trim();

  if (!trimmedTitle) {
    throw new Error("タイトルは必須です。");
  }

  const docRef = await addDoc(scriptsRef, {
    ownerUid,
    title: trimmedTitle,
    status: "draft",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return docRef.id;
};

export const fetchScriptsByProjectId = async (projectId: string): Promise<ScriptSummary[]> => {
  const scriptsRef = getProjectScriptsCollection(projectId);
  const snapshot = await getDocs(scriptsRef);

  return snapshot.docs
    .map((scriptDoc) => {
      const data = scriptDoc.data() as ScriptDocument;
      return {
        id: scriptDoc.id,
        status: toScriptStatus(data.status),
        sortOrder: normalizeSortOrder(data.sortOrder, Number.MAX_SAFE_INTEGER),
        title: toScriptTitle(data.title),
        updatedAt: toUpdatedAtIso(data.updatedAt)
      };
    })
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
};

export const createProjectScript = async (
  projectId: string,
  input: CreateProjectScriptInput
): Promise<string> => {
  const trimmedTitle = input.title.trim();
  if (!trimmedTitle) {
    throw new Error("タイトルは必須です。");
  }

  const scriptsRef = getProjectScriptsCollection(projectId);
  const docRef = await addDoc(scriptsRef, {
    title: trimmedTitle,
    status: "draft",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return docRef.id;
};

const toScriptTitle = (value: unknown): string => {
  return typeof value === "string" && value.trim().length > 0 ? value : "無題";
};

export const fetchScriptByIdForOwner = async (
  scriptId: string,
  ownerUid: string
): Promise<ScriptDetail | null> => {
  const firestore = getFirebaseFirestore();
  const scriptRef = doc(firestore, "scripts", scriptId);
  const snapshot = await getDoc(scriptRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data() as ScriptDocument;
  if (data.ownerUid !== ownerUid) {
    return null;
  }

  return {
    id: snapshot.id,
    title: toScriptTitle(data.title),
    status: toScriptStatus(data.status),
    references: toScriptReferences(data.references),
    createdAt: toUpdatedAtIso(data.createdAt),
    updatedAt: toUpdatedAtIso(data.updatedAt)
  };
};

export const fetchProjectScriptById = async (
  projectId: string,
  scriptId: string
): Promise<ScriptDetail | null> => {
  const firestore = getFirebaseFirestore();
  const scriptRef = doc(firestore, "projects", projectId, "scripts", scriptId);
  const snapshot = await getDoc(scriptRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data() as ScriptDocument;

  return {
    id: snapshot.id,
    title: toScriptTitle(data.title),
    status: toScriptStatus(data.status),
    references: toScriptReferences(data.references),
    createdAt: toUpdatedAtIso(data.createdAt),
    updatedAt: toUpdatedAtIso(data.updatedAt)
  };
};

export const updateScriptTitle = async (
  scriptId: string,
  input: UpdateScriptTitleInput
): Promise<void> => {
  const trimmedTitle = input.title.trim();
  if (!trimmedTitle) {
    throw new Error("タイトルは必須です。");
  }

  const firestore = getFirebaseFirestore();
  const scriptRef = doc(firestore, "scripts", scriptId);

  await updateDoc(scriptRef, {
    title: trimmedTitle,
    updatedAt: serverTimestamp()
  });
};

export const updateProjectScriptTitle = async (
  projectId: string,
  scriptId: string,
  input: UpdateScriptTitleInput
): Promise<void> => {
  const trimmedTitle = input.title.trim();
  if (!trimmedTitle) {
    throw new Error("タイトルは必須です。");
  }

  const firestore = getFirebaseFirestore();
  const scriptRef = doc(firestore, "projects", projectId, "scripts", scriptId);

  await updateDoc(scriptRef, {
    title: trimmedTitle,
    updatedAt: serverTimestamp()
  });
};

export const updateProjectScriptStatus = async (
  projectId: string,
  scriptId: string,
  input: UpdateProjectScriptStatusInput
): Promise<void> => {
  const firestore = getFirebaseFirestore();
  const scriptRef = doc(firestore, "projects", projectId, "scripts", scriptId);

  await updateDoc(scriptRef, {
    status: input.status,
    updatedAt: serverTimestamp()
  });
};

export const updateProjectScriptReferences = async (
  projectId: string,
  scriptId: string,
  input: UpdateProjectScriptReferencesInput
): Promise<void> => {
  const firestore = getFirebaseFirestore();
  const scriptRef = doc(firestore, "projects", projectId, "scripts", scriptId);

  await updateDoc(scriptRef, {
    references: input.references.map((reference) => ({
      id: reference.id,
      text: reference.text.trim(),
      url: reference.url.trim()
    })),
    updatedAt: serverTimestamp()
  });
};

export const reorderScripts = async (
  ownerUid: string,
  input: ReorderScriptsInput
): Promise<void> => {
  const firestore = getFirebaseFirestore();
  const batch = writeBatch(firestore);

  input.forEach((script, index) => {
    const scriptRef = doc(firestore, "scripts", script.id);
    batch.update(scriptRef, {
      ownerUid,
      sortOrder: index,
      updatedAt: serverTimestamp()
    });
  });

  await batch.commit();
};

export const deleteScript = async (scriptId: string): Promise<void> => {
  const firestore = getFirebaseFirestore();
  const speakersRef = collection(firestore, "scripts", scriptId, "speakers");
  const itemsRef = collection(firestore, "scripts", scriptId, "items");
  const scriptRef = doc(firestore, "scripts", scriptId);

  const [speakersSnapshot, itemsSnapshot] = await Promise.all([getDocs(speakersRef), getDocs(itemsRef)]);
  const batch = writeBatch(firestore);

  speakersSnapshot.docs.forEach((speakerDoc) => {
    batch.delete(speakerDoc.ref);
  });

  itemsSnapshot.docs.forEach((itemDoc) => {
    batch.delete(itemDoc.ref);
  });

  batch.delete(scriptRef);
  await batch.commit();
};

export const deleteProjectScript = async (projectId: string, scriptId: string): Promise<void> => {
  const firestore = getFirebaseFirestore();
  const speakersRef = collection(firestore, "projects", projectId, "scripts", scriptId, "speakers");
  const itemsRef = collection(firestore, "projects", projectId, "scripts", scriptId, "items");
  const scriptRef = doc(firestore, "projects", projectId, "scripts", scriptId);

  const [speakersSnapshot, itemsSnapshot] = await Promise.all([getDocs(speakersRef), getDocs(itemsRef)]);
  const batch = writeBatch(firestore);

  speakersSnapshot.docs.forEach((speakerDoc) => {
    batch.delete(speakerDoc.ref);
  });

  itemsSnapshot.docs.forEach((itemDoc) => {
    batch.delete(itemDoc.ref);
  });

  batch.delete(scriptRef);
  await batch.commit();
};

export const duplicateProjectScript = async (projectId: string, scriptId: string): Promise<string> => {
  const firestore = getFirebaseFirestore();
  const sourceScriptRef = doc(firestore, "projects", projectId, "scripts", scriptId);
  const sourceScriptSnapshot = await getDoc(sourceScriptRef);

  if (!sourceScriptSnapshot.exists()) {
    throw new Error("複製元の台本が見つかりません。");
  }

  const sourceData = sourceScriptSnapshot.data() as ScriptDocument;
  const sourceTitle = toScriptTitle(sourceData.title);
  const references = toScriptReferences(sourceData.references);
  const speakersRef = collection(firestore, "projects", projectId, "scripts", scriptId, "speakers");
  const itemsRef = collection(firestore, "projects", projectId, "scripts", scriptId, "items");
  const [speakersSnapshot, itemsSnapshot] = await Promise.all([getDocs(speakersRef), getDocs(itemsRef)]);

  const duplicatedScriptRef = doc(collection(firestore, "projects", projectId, "scripts"));
  const batch = writeBatch(firestore);

  batch.set(duplicatedScriptRef, {
    title: `${sourceTitle}（コピー）`,
    status: toScriptStatus(sourceData.status),
    references: references.map((reference) => ({
      id: reference.id,
      text: reference.text,
      url: reference.url
    })),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  speakersSnapshot.docs.forEach((speakerDoc) => {
    const duplicatedSpeakerRef = doc(
      firestore,
      "projects",
      projectId,
      "scripts",
      duplicatedScriptRef.id,
      "speakers",
      speakerDoc.id
    );
    const speakerData = speakerDoc.data() as Record<string, unknown>;

    batch.set(duplicatedSpeakerRef, {
      name: typeof speakerData.name === "string" ? speakerData.name : "",
      color: typeof speakerData.color === "string" ? speakerData.color : "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  });

  itemsSnapshot.docs.forEach((itemDoc) => {
    const duplicatedItemRef = doc(
      firestore,
      "projects",
      projectId,
      "scripts",
      duplicatedScriptRef.id,
      "items",
      itemDoc.id
    );
    const itemData = itemDoc.data() as Record<string, unknown>;

    batch.set(duplicatedItemRef, {
      ...itemData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  });

  await batch.commit();
  return duplicatedScriptRef.id;
};
