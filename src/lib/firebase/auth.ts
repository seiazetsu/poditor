import {
  UserCredential,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";

import { getFirebaseApp } from "@/lib/firebase/client";

const getFirebaseAuth = () => getAuth(getFirebaseApp());

export const signUpWithEmail = async (
  email: string,
  password: string
): Promise<UserCredential> => {
  return createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
};

export const signInWithEmail = async (
  email: string,
  password: string
): Promise<UserCredential> => {
  return signInWithEmailAndPassword(getFirebaseAuth(), email, password);
};

export const signOutUser = async (): Promise<void> => {
  await signOut(getFirebaseAuth());
};

export const mapFirebaseAuthError = (error: unknown): string => {
  if (typeof error !== "object" || !error || !("code" in error)) {
    return "認証処理に失敗しました。時間をおいて再度お試しください。";
  }

  const code = String(error.code);

  const errorMap: Record<string, string> = {
    "auth/email-already-in-use": "このメールアドレスは既に使用されています。",
    "auth/invalid-email": "メールアドレスの形式が正しくありません。",
    "auth/weak-password": "パスワードは 6 文字以上で入力してください。",
    "auth/user-not-found": "ユーザーが見つかりません。",
    "auth/wrong-password": "パスワードが正しくありません。",
    "auth/invalid-credential": "メールアドレスまたはパスワードが正しくありません。"
  };

  return errorMap[code] ?? "認証処理に失敗しました。時間をおいて再度お試しください。";
};
