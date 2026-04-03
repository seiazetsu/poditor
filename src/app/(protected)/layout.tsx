"use client";

import { Center, Spinner } from "@chakra-ui/react";

import { useRequireAuth } from "@/hooks/use-require-auth";

type ProtectedLayoutProps = {
  children: React.ReactNode;
};

const ProtectedLayout = ({ children }: ProtectedLayoutProps) => {
  const { user, loading } = useRequireAuth();

  if (loading || !user) {
    return (
      <Center minH="100vh">
        <Spinner size="lg" />
      </Center>
    );
  }

  return <>{children}</>;
};

export default ProtectedLayout;
