"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Center, Spinner } from "@chakra-ui/react";

import { useAuth } from "@/components/auth/auth-provider";

const HomePage = () => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (user) {
      router.replace("/projects");
      return;
    }

    router.replace("/login");
  }, [loading, router, user]);

  return (
    <Center minH="100vh">
      <Spinner size="lg" />
    </Center>
  );
};

export default HomePage;
