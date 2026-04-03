"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";

import { signInWithEmail, signOutUser, signUpWithEmail } from "@/lib/firebase/auth";
import { getFirebaseApp, hasFirebaseConfig } from "@/lib/firebase/client";
import { ensureUserProfile } from "@/lib/firebase/users";
import { AuthContextValue } from "@/types/auth";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: React.ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthContextValue["user"]>(null);
  const [loading, setLoading] = useState(hasFirebaseConfig());

  useEffect(() => {
    if (!hasFirebaseConfig()) {
      return undefined;
    }

    const auth = getAuth(getFirebaseApp());
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);

      if (nextUser?.email) {
        void ensureUserProfile(nextUser.uid, nextUser.email).catch((error) => {
          console.error("Failed to ensure user profile:", error);
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signIn: async (email: string, password: string) => {
        await signInWithEmail(email, password);
      },
      signUp: async (email: string, password: string) => {
        await signUpWithEmail(email, password);
      },
      signOut: async () => {
        await signOutUser();
      }
    }),
    [loading, user]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth は AuthProvider 内で使用してください。");
  }

  return context;
};
