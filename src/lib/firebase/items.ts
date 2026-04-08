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
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import { getFirebaseFirestore } from "@/lib/firebase/firestore";
import {
  ScriptDialogueItem,
  ScriptItem,
  ScriptMediaItem,
  ScriptMediaType,
  ScriptSectionItem
} from "@/types/script";

type ItemDocument = {
  type?: unknown;
  order?: unknown;
  speakerId?: unknown;
  pairId?: unknown;
  title?: unknown;
  content?: unknown;
  mediaType?: unknown;
  label?: unknown;
  url?: unknown;
  note?: unknown;
  updatedAt?: unknown;
};

type CreateDialogueInput = {
  order: number;
  speakerId: string;
  pairId?: string;
  content: string;
};

type UpdateDialogueInput = {
  speakerId: string;
  content: string;
};

type CreateSectionInput = {
  order: number;
  title: string;
};

type UpdateSectionInput = {
  title: string;
};

type CreateMediaInput = {
  order: number;
  speakerId?: string;
  pairId?: string;
  mediaType: ScriptMediaType;
  label: string;
  url: string;
  note: string;
};

type UpdateMediaInput = {
  mediaType: ScriptMediaType;
  label: string;
  url: string;
  note: string;
};

type ReorderDialogueInput = string[];

type ReplaceProjectScriptItemsInput = Array<
  | {
      type: "dialogue";
      speakerId: string;
      content: string;
    }
  | {
      type: "section";
      title: string;
    }
  | {
      type: "media";
      mediaType: ScriptMediaType;
      url: string;
    }
>;

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

const normalizeOrder = (value: unknown): number => {
  return typeof value === "number" && Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
};

const normalizeMediaType = (value: unknown): ScriptMediaType => {
  return value === "video" ? "video" : "image";
};

const getItemsCollection = (scriptId: string) => {
  const firestore = getFirebaseFirestore();
  return collection(firestore, "scripts", scriptId, "items");
};

const getProjectItemsCollection = (projectId: string, scriptId: string) => {
  const firestore = getFirebaseFirestore();
  return collection(firestore, "projects", projectId, "scripts", scriptId, "items");
};

export const fetchScriptItems = async (scriptId: string): Promise<ScriptItem[]> => {
  const itemsRef = getItemsCollection(scriptId);
  const itemsQuery = query(itemsRef, orderBy("order", "asc"));
  const snapshot = await getDocs(itemsQuery);

  return snapshot.docs
    .map((itemDoc) => {
      const data = itemDoc.data() as ItemDocument;
      const base = {
        id: itemDoc.id,
        order: normalizeOrder(data.order),
        updatedAt: toIsoDate(data.updatedAt)
      };

      if (data.type === "media") {
        const mediaItem: ScriptMediaItem = {
          ...base,
          type: "media",
          speakerId: typeof data.speakerId === "string" ? data.speakerId : "",
          pairId: typeof data.pairId === "string" ? data.pairId : undefined,
          mediaType: normalizeMediaType(data.mediaType),
          label: typeof data.label === "string" ? data.label : "",
          url: typeof data.url === "string" ? data.url : "",
          note: typeof data.note === "string" ? data.note : ""
        };
        return mediaItem;
      }

      if (data.type === "section") {
        const sectionItem: ScriptSectionItem = {
          ...base,
          type: "section",
          speakerId: "",
          title: typeof data.title === "string" ? data.title : ""
        };
        return sectionItem;
      }

      const dialogueItem: ScriptDialogueItem = {
        ...base,
        type: "dialogue",
        speakerId: typeof data.speakerId === "string" ? data.speakerId : "",
        pairId: typeof data.pairId === "string" ? data.pairId : undefined,
        content: typeof data.content === "string" ? data.content : ""
      };
      return dialogueItem;
    })
    .sort((a, b) => a.order - b.order);
};

export const fetchDialogueItems = async (scriptId: string): Promise<ScriptDialogueItem[]> => {
  const items = await fetchScriptItems(scriptId);

  return items
    .filter((item): item is ScriptDialogueItem => item.type === "dialogue")
    .sort((a, b) => a.order - b.order);
};

export const fetchProjectDialogueItems = async (
  projectId: string,
  scriptId: string
): Promise<ScriptDialogueItem[]> => {
  const items = await fetchProjectScriptItems(projectId, scriptId);

  return items
    .filter((item): item is ScriptDialogueItem => item.type === "dialogue")
    .sort((a, b) => a.order - b.order);
};

export const fetchProjectScriptItems = async (projectId: string, scriptId: string): Promise<ScriptItem[]> => {
  const itemsRef = getProjectItemsCollection(projectId, scriptId);
  const itemsQuery = query(itemsRef, orderBy("order", "asc"));
  const snapshot = await getDocs(itemsQuery);

  return snapshot.docs
    .map((itemDoc) => {
      const data = itemDoc.data() as ItemDocument;
      const base = {
        id: itemDoc.id,
        order: normalizeOrder(data.order),
        updatedAt: toIsoDate(data.updatedAt)
      };

      if (data.type === "media") {
        const mediaItem: ScriptMediaItem = {
          ...base,
          type: "media",
          speakerId: typeof data.speakerId === "string" ? data.speakerId : "",
          pairId: typeof data.pairId === "string" ? data.pairId : undefined,
          mediaType: normalizeMediaType(data.mediaType),
          label: typeof data.label === "string" ? data.label : "",
          url: typeof data.url === "string" ? data.url : "",
          note: typeof data.note === "string" ? data.note : ""
        };
        return mediaItem;
      }

      if (data.type === "section") {
        const sectionItem: ScriptSectionItem = {
          ...base,
          type: "section",
          speakerId: "",
          title: typeof data.title === "string" ? data.title : ""
        };
        return sectionItem;
      }

      return {
        ...base,
        type: "dialogue" as const,
        speakerId: typeof data.speakerId === "string" ? data.speakerId : "",
        pairId: typeof data.pairId === "string" ? data.pairId : undefined,
        content: typeof data.content === "string" ? data.content : ""
      };
    })
    .sort((a, b) => a.order - b.order);
};

export const createDialogueItem = async (
  scriptId: string,
  input: CreateDialogueInput
): Promise<string> => {
  const trimmedContent = input.content.trim();
  if (!trimmedContent) {
    throw new Error("本文は必須です。");
  }
  if (!input.speakerId) {
    throw new Error("話者の選択は必須です。");
  }

  const itemsRef = getItemsCollection(scriptId);
  const docRef = await addDoc(itemsRef, {
    type: "dialogue",
    order: input.order,
    speakerId: input.speakerId,
    pairId: input.pairId ?? null,
    content: trimmedContent,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return docRef.id;
};

export const createProjectDialogueItem = async (
  projectId: string,
  scriptId: string,
  input: CreateDialogueInput
): Promise<string> => {
  const trimmedContent = input.content.trim();
  if (!trimmedContent) {
    throw new Error("本文は必須です。");
  }
  if (!input.speakerId) {
    throw new Error("話者の選択は必須です。");
  }

  const itemsRef = getProjectItemsCollection(projectId, scriptId);
  const docRef = await addDoc(itemsRef, {
    type: "dialogue",
    order: input.order,
    speakerId: input.speakerId,
    pairId: input.pairId ?? null,
    content: trimmedContent,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return docRef.id;
};

export const createSectionItem = async (scriptId: string, input: CreateSectionInput): Promise<string> => {
  const trimmedTitle = input.title.trim();
  if (!trimmedTitle) {
    throw new Error("セクション名は必須です。");
  }

  const itemsRef = getItemsCollection(scriptId);
  const docRef = await addDoc(itemsRef, {
    type: "section",
    order: input.order,
    speakerId: "",
    title: trimmedTitle,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return docRef.id;
};

export const createProjectSectionItem = async (
  projectId: string,
  scriptId: string,
  input: CreateSectionInput
): Promise<string> => {
  const trimmedTitle = input.title.trim();
  if (!trimmedTitle) {
    throw new Error("セクション名は必須です。");
  }

  const itemsRef = getProjectItemsCollection(projectId, scriptId);
  const docRef = await addDoc(itemsRef, {
    type: "section",
    order: input.order,
    speakerId: "",
    title: trimmedTitle,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return docRef.id;
};

export const updateProjectSectionItem = async (
  projectId: string,
  scriptId: string,
  itemId: string,
  input: UpdateSectionInput
): Promise<void> => {
  const trimmedTitle = input.title.trim();
  if (!trimmedTitle) {
    throw new Error("セクション名は必須です。");
  }

  const firestore = getFirebaseFirestore();
  const itemRef = doc(firestore, "projects", projectId, "scripts", scriptId, "items", itemId);
  await updateDoc(itemRef, {
    title: trimmedTitle,
    updatedAt: serverTimestamp()
  });
};

export const updateDialogueItem = async (
  scriptId: string,
  itemId: string,
  input: UpdateDialogueInput
): Promise<void> => {
  const trimmedContent = input.content.trim();
  if (!trimmedContent) {
    throw new Error("本文は必須です。");
  }
  if (!input.speakerId) {
    throw new Error("話者の選択は必須です。");
  }

  const firestore = getFirebaseFirestore();
  const itemRef = doc(firestore, "scripts", scriptId, "items", itemId);
  await updateDoc(itemRef, {
    speakerId: input.speakerId,
    content: trimmedContent,
    updatedAt: serverTimestamp()
  });
};

export const updateProjectDialogueItem = async (
  projectId: string,
  scriptId: string,
  itemId: string,
  input: UpdateDialogueInput
): Promise<void> => {
  const trimmedContent = input.content.trim();
  if (!trimmedContent) {
    throw new Error("本文は必須です。");
  }
  if (!input.speakerId) {
    throw new Error("話者の選択は必須です。");
  }

  const firestore = getFirebaseFirestore();
  const itemRef = doc(firestore, "projects", projectId, "scripts", scriptId, "items", itemId);
  await updateDoc(itemRef, {
    speakerId: input.speakerId,
    content: trimmedContent,
    updatedAt: serverTimestamp()
  });
};

export const createMediaItem = async (
  scriptId: string,
  input: CreateMediaInput
): Promise<string> => {
  const trimmedUrl = input.url.trim();
  if (!trimmedUrl) {
    throw new Error("URL は必須です。");
  }

  const itemsRef = getItemsCollection(scriptId);
  const docRef = await addDoc(itemsRef, {
    type: "media",
    order: input.order,
    speakerId: input.speakerId ?? "",
    pairId: input.pairId ?? null,
    mediaType: input.mediaType,
    label: input.label.trim(),
    url: trimmedUrl,
    note: input.note.trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return docRef.id;
};

export const updateMediaItem = async (
  scriptId: string,
  itemId: string,
  input: UpdateMediaInput
): Promise<void> => {
  const trimmedUrl = input.url.trim();
  if (!trimmedUrl) {
    throw new Error("URL は必須です。");
  }

  const firestore = getFirebaseFirestore();
  const itemRef = doc(firestore, "scripts", scriptId, "items", itemId);
  await updateDoc(itemRef, {
    mediaType: input.mediaType,
    label: input.label.trim(),
    url: trimmedUrl,
    note: input.note.trim(),
    updatedAt: serverTimestamp()
  });
};

export const createProjectMediaItem = async (
  projectId: string,
  scriptId: string,
  input: CreateMediaInput
): Promise<string> => {
  const trimmedUrl = input.url.trim();
  if (!trimmedUrl) {
    throw new Error("URL は必須です。");
  }

  const itemsRef = getProjectItemsCollection(projectId, scriptId);
  const docRef = await addDoc(itemsRef, {
    type: "media",
    order: input.order,
    speakerId: input.speakerId ?? "",
    pairId: input.pairId ?? null,
    mediaType: input.mediaType,
    label: input.label.trim(),
    url: trimmedUrl,
    note: input.note.trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return docRef.id;
};

export const updateProjectScriptItemSpeaker = async (
  projectId: string,
  scriptId: string,
  itemId: string,
  speakerId: string
): Promise<void> => {
  if (!speakerId) {
    throw new Error("話者の選択は必須です。");
  }

  const firestore = getFirebaseFirestore();
  const itemRef = doc(firestore, "projects", projectId, "scripts", scriptId, "items", itemId);
  await updateDoc(itemRef, {
    speakerId,
    updatedAt: serverTimestamp()
  });
};

export const deleteScriptItem = async (scriptId: string, itemId: string): Promise<void> => {
  const firestore = getFirebaseFirestore();
  const itemRef = doc(firestore, "scripts", scriptId, "items", itemId);
  await deleteDoc(itemRef);
};

export const deleteDialogueItem = async (scriptId: string, itemId: string): Promise<void> => {
  await deleteScriptItem(scriptId, itemId);
};

export const deleteProjectDialogueItem = async (
  projectId: string,
  scriptId: string,
  itemId: string
): Promise<void> => {
  await deleteProjectScriptItem(projectId, scriptId, itemId);
};

export const deleteProjectScriptItem = async (
  projectId: string,
  scriptId: string,
  itemId: string
): Promise<void> => {
  const firestore = getFirebaseFirestore();
  const itemRef = doc(firestore, "projects", projectId, "scripts", scriptId, "items", itemId);
  await deleteDoc(itemRef);
};

export const reorderDialogueItems = async (
  scriptId: string,
  itemIdsInOrder: ReorderDialogueInput
): Promise<void> => {
  const firestore = getFirebaseFirestore();
  const batch = writeBatch(firestore);

  itemIdsInOrder.forEach((itemId, index) => {
    const itemRef = doc(firestore, "scripts", scriptId, "items", itemId);
    batch.update(itemRef, {
      order: index + 1,
      updatedAt: serverTimestamp()
    });
  });

  await batch.commit();
};

export const reorderProjectDialogueItems = async (
  projectId: string,
  scriptId: string,
  itemIdsInOrder: ReorderDialogueInput
): Promise<void> => {
  await reorderProjectScriptItems(projectId, scriptId, itemIdsInOrder);
};

export const reorderProjectScriptItems = async (
  projectId: string,
  scriptId: string,
  itemIdsInOrder: ReorderDialogueInput
): Promise<void> => {
  const firestore = getFirebaseFirestore();
  const batch = writeBatch(firestore);

  itemIdsInOrder.forEach((itemId, index) => {
    const itemRef = doc(firestore, "projects", projectId, "scripts", scriptId, "items", itemId);
    batch.update(itemRef, {
      order: index + 1,
      updatedAt: serverTimestamp()
    });
  });

  await batch.commit();
};

export const replaceProjectScriptItems = async (
  projectId: string,
  scriptId: string,
  items: ReplaceProjectScriptItemsInput
): Promise<void> => {
  const firestore = getFirebaseFirestore();
  const itemsRef = getProjectItemsCollection(projectId, scriptId);
  const existingSnapshot = await getDocs(itemsRef);
  const batch = writeBatch(firestore);

  existingSnapshot.docs.forEach((itemDoc) => {
    batch.delete(itemDoc.ref);
  });

  let currentPairId: string | null = null;
  let currentSpeakerId = "";

  items.forEach((item, index) => {
    const nextRef = doc(itemsRef);

    if (item.type === "section") {
      currentPairId = null;
      currentSpeakerId = "";
      batch.set(nextRef, {
        type: "section",
        order: index + 1,
        speakerId: "",
        title: item.title.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return;
    }

    if (item.type === "media") {
      batch.set(nextRef, {
        type: "media",
        order: index + 1,
        speakerId: currentSpeakerId,
        pairId: currentPairId,
        mediaType: item.mediaType,
        label: "",
        url: item.url.trim(),
        note: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return;
    }

    currentPairId = `text-pair-${index + 1}`;
    currentSpeakerId = item.speakerId;
    batch.set(nextRef, {
      type: "dialogue",
      order: index + 1,
      speakerId: item.speakerId,
      pairId: currentPairId,
      content: item.content.trim(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  });

  await batch.commit();
};
