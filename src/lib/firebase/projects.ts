import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch
} from "firebase/firestore";

import { getFirebaseFirestore } from "@/lib/firebase/firestore";
import { fetchUserByEmail, normalizeEmail } from "@/lib/firebase/users";
import { ProjectDetail, ProjectMember, ProjectMemberRole, ProjectSummary } from "@/types/project";

type ProjectDocument = {
  name?: unknown;
  ownerUid?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type MemberDocument = {
  uid?: unknown;
  email?: unknown;
  role?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type CreateProjectInput = {
  name: string;
  ownerUid: string;
  ownerEmail: string;
};

type AddProjectMemberInput = {
  email: string;
  role: ProjectMemberRole;
};

type UserProjectMembershipDocument = {
  projectId?: unknown;
  updatedAt?: unknown;
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

const toProjectName = (value: unknown): string => {
  return typeof value === "string" && value.trim().length > 0 ? value : "無題プロジェクト";
};

const toMemberRole = (value: unknown): ProjectMemberRole => {
  return value === "owner" ? "owner" : "member";
};

const getProjectsCollection = () => {
  const firestore = getFirebaseFirestore();
  return collection(firestore, "projects");
};

const getProjectMembersCollection = (projectId: string) => {
  const firestore = getFirebaseFirestore();
  return collection(firestore, "projects", projectId, "members");
};

const getUserProjectsCollection = (uid: string) => {
  const firestore = getFirebaseFirestore();
  return collection(firestore, "userProjects", uid, "memberships");
};

export const createProject = async ({ name, ownerUid, ownerEmail }: CreateProjectInput): Promise<string> => {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("プロジェクト名は必須です。");
  }

  const firestore = getFirebaseFirestore();
  const projectsRef = getProjectsCollection();
  const projectRef = await addDoc(projectsRef, {
    name: trimmedName,
    ownerUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  const ownerMemberRef = doc(firestore, "projects", projectRef.id, "members", ownerUid);
  const ownerProjectIndexRef = doc(firestore, "userProjects", ownerUid, "memberships", projectRef.id);
  const batch = writeBatch(firestore);

  batch.set(ownerMemberRef, {
    uid: ownerUid,
    email: ownerEmail.trim(),
    role: "owner",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  batch.set(ownerProjectIndexRef, {
    projectId: projectRef.id,
    updatedAt: serverTimestamp()
  });

  await batch.commit();

  return projectRef.id;
};

export const fetchProjectsForUser = async (userUid: string): Promise<ProjectSummary[]> => {
  const firestore = getFirebaseFirestore();
  const membershipsRef = getUserProjectsCollection(userUid);
  let membershipsSnapshot;

  try {
    membershipsSnapshot = await getDocs(membershipsRef);
  } catch {
    membershipsSnapshot = null;
  }

  const indexedProjects = await Promise.all(
    (membershipsSnapshot?.docs ?? []).map(async (membershipDoc) => {
      const membershipData = membershipDoc.data() as UserProjectMembershipDocument;
      const projectId =
        typeof membershipData.projectId === "string" && membershipData.projectId.length > 0
          ? membershipData.projectId
          : membershipDoc.id;

      try {
        const projectRef = doc(firestore, "projects", projectId);
        const projectSnapshot = await getDoc(projectRef);
        if (!projectSnapshot.exists()) {
          return null;
        }

        const data = projectSnapshot.data() as ProjectDocument;

        return {
          id: projectSnapshot.id,
          name: toProjectName(data.name),
          ownerUid: typeof data.ownerUid === "string" ? data.ownerUid : "",
          updatedAt: toIsoDate(data.updatedAt)
        } satisfies ProjectSummary;
      } catch {
        return null;
      }
    })
  );

  let ownedProjects: ProjectSummary[] = [];

  try {
    const ownedProjectsSnapshot = await getDocs(
      query(getProjectsCollection(), where("ownerUid", "==", userUid))
    );

    ownedProjects = ownedProjectsSnapshot.docs.map((projectDoc) => {
      const data = projectDoc.data() as ProjectDocument;
      return {
        id: projectDoc.id,
        name: toProjectName(data.name),
        ownerUid: typeof data.ownerUid === "string" ? data.ownerUid : "",
        updatedAt: toIsoDate(data.updatedAt)
      } satisfies ProjectSummary;
    });
  } catch {
    ownedProjects = [];
  }

  return [...indexedProjects, ...ownedProjects]
    .filter((project): project is ProjectSummary => project !== null)
    .filter((project, index, projects) => projects.findIndex((item) => item.id === project.id) === index)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

export const fetchProjectByIdForUser = async (
  projectId: string,
  userUid: string
): Promise<ProjectDetail | null> => {
  const firestore = getFirebaseFirestore();
  const memberRef = doc(firestore, "projects", projectId, "members", userUid);
  const memberSnapshot = await getDoc(memberRef);
  if (!memberSnapshot.exists()) {
    return null;
  }

  const projectRef = doc(firestore, "projects", projectId);
  const projectSnapshot = await getDoc(projectRef);
  if (!projectSnapshot.exists()) {
    return null;
  }

  const data = projectSnapshot.data() as ProjectDocument;
  return {
    id: projectSnapshot.id,
    name: toProjectName(data.name),
    ownerUid: typeof data.ownerUid === "string" ? data.ownerUid : "",
    createdAt: toIsoDate(data.createdAt),
    updatedAt: toIsoDate(data.updatedAt)
  };
};

export const fetchProjectMembers = async (projectId: string): Promise<ProjectMember[]> => {
  const membersRef = getProjectMembersCollection(projectId);
  const snapshot = await getDocs(membersRef);

  return snapshot.docs
    .map((memberDoc) => {
      const data = memberDoc.data() as MemberDocument;
      return {
        id: memberDoc.id,
        uid: typeof data.uid === "string" ? data.uid : "",
        email: typeof data.email === "string" ? data.email : "",
        role: toMemberRole(data.role),
        createdAt: toIsoDate(data.createdAt),
        updatedAt: toIsoDate(data.updatedAt)
      } satisfies ProjectMember;
    })
    .sort((a, b) => {
      if (a.role !== b.role) {
        return a.role === "owner" ? -1 : 1;
      }
      return a.email.localeCompare(b.email, "ja");
    });
};

export const addProjectMember = async (
  projectId: string,
  input: AddProjectMemberInput
): Promise<void> => {
  const trimmedEmail = normalizeEmail(input.email);

  if (!trimmedEmail) {
    throw new Error("email は必須です。");
  }

  const appUser = await fetchUserByEmail(trimmedEmail);
  if (!appUser || !appUser.uid) {
    throw new Error("そのメールアドレスのユーザーはまだ登録されていません。");
  }

  const firestore = getFirebaseFirestore();
  const memberRef = doc(firestore, "projects", projectId, "members", appUser.uid);
  const memberProjectIndexRef = doc(firestore, "userProjects", appUser.uid, "memberships", projectId);
  const existingSnapshot = await getDoc(memberRef);
  if (existingSnapshot.exists()) {
    throw new Error("このユーザーはすでに参加しています。");
  }

  const batch = writeBatch(firestore);

  batch.set(memberRef, {
    uid: appUser.uid,
    email: appUser.email,
    role: input.role,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  batch.set(memberProjectIndexRef, {
    projectId,
    updatedAt: serverTimestamp()
  });

  await batch.commit();
};

export const deleteProject = async (projectId: string): Promise<void> => {
  const firestore = getFirebaseFirestore();
  const membersRef = collection(firestore, "projects", projectId, "members");
  const scriptsRef = collection(firestore, "projects", projectId, "scripts");
  const projectRef = doc(firestore, "projects", projectId);

  const [membersSnapshot, scriptsSnapshot] = await Promise.all([getDocs(membersRef), getDocs(scriptsRef)]);
  const batch = writeBatch(firestore);

  for (const scriptDoc of scriptsSnapshot.docs) {
    const speakersRef = collection(firestore, "projects", projectId, "scripts", scriptDoc.id, "speakers");
    const itemsRef = collection(firestore, "projects", projectId, "scripts", scriptDoc.id, "items");
    const [speakersSnapshot, itemsSnapshot] = await Promise.all([getDocs(speakersRef), getDocs(itemsRef)]);

    speakersSnapshot.docs.forEach((speakerDoc) => {
      batch.delete(speakerDoc.ref);
    });

    itemsSnapshot.docs.forEach((itemDoc) => {
      batch.delete(itemDoc.ref);
    });

    batch.delete(scriptDoc.ref);
  }

  membersSnapshot.docs.forEach((memberDoc) => {
    const data = memberDoc.data() as MemberDocument;
    if (typeof data.uid === "string" && data.uid.length > 0) {
      const membershipIndexRef = doc(firestore, "userProjects", data.uid, "memberships", projectId);
      batch.delete(membershipIndexRef);
    }

    batch.delete(memberDoc.ref);
  });

  batch.delete(projectRef);
  await batch.commit();
};
