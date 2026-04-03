"use client";

import { ChakraProvider } from "@chakra-ui/react";

import { AuthProvider } from "@/components/auth/auth-provider";

type ProvidersProps = {
  children: React.ReactNode;
};

export const Providers = ({ children }: ProvidersProps) => {
  return (
    <ChakraProvider>
      <AuthProvider>{children}</AuthProvider>
    </ChakraProvider>
  );
};
