"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Center, Spinner } from "@chakra-ui/react";

import { AuthShell } from "@/components/auth/auth-shell";
import { EmailAuthForm } from "@/components/auth/email-auth-form";
import { useAuth } from "@/components/auth/auth-provider";

const SignupPage = () => {
  const { user, loading, signUp } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/projects");
    }
  }, [loading, router, user]);

  const handleSignup = async (email: string, password: string) => {
    setSubmitting(true);

    try {
      await signUp(email, password);
      router.replace("/projects");
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
      title="ユーザー登録"
      description="メールアドレスとパスワードで新規アカウントを作成します。"
    >
      <EmailAuthForm mode="signup" onSubmit={handleSignup} loading={submitting} />
    </AuthShell>
  );
};

export default SignupPage;
