"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Center, Spinner } from "@chakra-ui/react";

const LegacyScriptsPage = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace("/projects");
  }, [router]);

  return (
    <Center minH="100vh">
      <Spinner size="lg" />
    </Center>
  );
};

export default LegacyScriptsPage;
