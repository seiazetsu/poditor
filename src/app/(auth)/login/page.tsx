"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Center, Spinner } from "@chakra-ui/react";

import { AuthShell } from "@/components/auth/auth-shell";
import { EmailAuthForm } from "@/components/auth/email-auth-form";
import { useAuth } from "@/components/auth/auth-provider";

const LoginPageContent = () => {
  const { user, loading, signIn } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const next = searchParams.get("next") || "/projects";

  useEffect(() => {
    if (!loading && user) {
      router.replace(next);
    }
  }, [loading, next, router, user]);

  const handleLogin = async (email: string, password: string) => {
    setSubmitting(true);

    try {
      await signIn(email, password);
      router.replace(next);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Center minH="100vh">
        <Spinner size="lg" />
      </Center>
    );
  }

  return (
    <AuthShell
      title="ログイン"
      description="Poditor にログインして台本管理をはじめましょう。"
    >
      <EmailAuthForm mode="login" onSubmit={handleLogin} loading={submitting} />
    </AuthShell>
  );
};

const LoginPage = () => {
  return (
    <Suspense
      fallback={
        <Center minH="100vh">
          <Spinner size="lg" />
        </Center>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
};

export default LoginPage;
