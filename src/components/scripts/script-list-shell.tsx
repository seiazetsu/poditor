"use client";

import NextLink from "next/link";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  HStack,
  Stack,
  Text
} from "@chakra-ui/react";

import { useAuth } from "@/components/auth/auth-provider";
import { ScriptSummary } from "@/types/script";

type ScriptListShellProps = {
  scripts: ScriptSummary[];
  isLoading: boolean;
  errorMessage: string | null;
  feedbackMessage: string | null;
  isDeletingId: string | null;
  draggedScriptId: string | null;
  onRetry: () => void;
  onLogout: () => Promise<void>;
  onDelete: (scriptId: string) => void;
  onDragStart: (scriptId: string) => void;
  onDrop: (targetScriptId: string) => void;
  onDragEnd: () => void;
};

const formatUpdatedAt = (updatedAt: string): string => {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(updatedAt));
};

export const ScriptListShell = ({
  scripts,
  isLoading,
  errorMessage,
  feedbackMessage,
  isDeletingId,
  draggedScriptId,
  onRetry,
  onLogout,
  onDelete,
  onDragStart,
  onDrop,
  onDragEnd
}: ScriptListShellProps) => {
  const { user } = useAuth();

  return (
    <Box bg="gray.50" minH="100vh" py={10}>
      <Container maxW="4xl">
        <Flex justify="space-between" align="center" gap={4} mb={8} wrap="wrap">
          <Stack spacing={1}>
            <Heading size="lg">台本一覧</Heading>
            <Text color="gray.600" fontSize="sm">
              ログイン中: {user?.email}
            </Text>
          </Stack>

          <Flex gap={3}>
            <Button as={NextLink} href="/scripts/new" colorScheme="teal" variant="outline">
              新規台本作成
            </Button>
            <Button colorScheme="gray" onClick={onLogout}>
              ログアウト
            </Button>
          </Flex>
        </Flex>

        <Stack spacing={3}>
          {errorMessage ? (
            <Alert status="error" rounded="md">
              <AlertIcon />
              <Flex justify="space-between" align="center" w="100%" gap={4} wrap="wrap">
                <Text>{errorMessage}</Text>
                <Button size="sm" onClick={onRetry}>
                  再読み込み
                </Button>
              </Flex>
            </Alert>
          ) : null}

          {feedbackMessage ? (
            <Alert status="info" rounded="md">
              <AlertIcon />
              {feedbackMessage}
            </Alert>
          ) : null}

          {isLoading ? (
            <Box bg="white" p={6} rounded="md" borderWidth="1px">
              <Text color="gray.600">台本を読み込んでいます...</Text>
            </Box>
          ) : null}

          {!isLoading && scripts.length === 0 ? (
            <Box bg="white" p={6} rounded="md" borderWidth="1px">
              <Text fontWeight="medium">台本はまだありません。</Text>
              <Text color="gray.600" fontSize="sm" mt={2}>
                「新規台本作成」から最初の台本を作成してください。
              </Text>
            </Box>
          ) : null}

          {scripts.map((script) => (
            <Flex
              key={script.id}
              bg="white"
              borderWidth="1px"
              rounded="md"
              p={4}
              justify="space-between"
              align="center"
              gap={4}
              wrap="wrap"
              draggable
              cursor="grab"
              opacity={draggedScriptId === script.id ? 0.6 : 1}
              borderColor={draggedScriptId === script.id ? "teal.400" : "gray.200"}
              onDragStart={() => onDragStart(script.id)}
              onDragOver={(event) => {
                event.preventDefault();
              }}
              onDrop={() => onDrop(script.id)}
              onDragEnd={onDragEnd}
            >
              <HStack spacing={3} align="start" flex="1" minW="0">
                <Text color="gray.400" fontSize="lg" lineHeight="1" mt={1}>
                  ⋮⋮
                </Text>
                <Stack spacing={1} minW="0">
                  <Text fontWeight="bold">{script.title}</Text>
                  <Text fontSize="sm" color="gray.600">
                    更新日時: {formatUpdatedAt(script.updatedAt)}
                  </Text>
                </Stack>
              </HStack>
              <HStack spacing={3}>
                <Button as={NextLink} href={`/scripts/${script.id}`} size="sm" variant="outline" colorScheme="teal">
                  基本設定
                </Button>
                <Button
                  as={NextLink}
                  href={`/scripts/${script.id}/compose`}
                  size="sm"
                  variant="outline"
                  colorScheme="blue"
                >
                  会話作成
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  colorScheme="red"
                  onClick={() => onDelete(script.id)}
                  isLoading={isDeletingId === script.id}
                >
                  削除
                </Button>
              </HStack>
            </Flex>
          ))}
        </Stack>
      </Container>
    </Box>
  );
};
