"use client";

import { Box, Heading, Stack, Text } from "@chakra-ui/react";

type AuthShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export const AuthShell = ({ title, description, children }: AuthShellProps) => {
  return (
    <Box minH="100vh" bg="gray.50" px={4} py={12}>
      <Box maxW="md" mx="auto" rounded="lg" bg="white" p={8} shadow="md">
        <Stack spacing={2} mb={6}>
          <Heading size="lg">{title}</Heading>
          <Text color="gray.600">{description}</Text>
        </Stack>
        {children}
      </Box>
    </Box>
  );
};
