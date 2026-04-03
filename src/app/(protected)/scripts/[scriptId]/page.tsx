"use client";

import { useCallback, useEffect, useState } from "react";
import NextLink from "next/link";
import { useParams } from "next/navigation";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Spinner,
  Stack,
  Text
} from "@chakra-ui/react";

import { useAuth } from "@/components/auth/auth-provider";
import { SaveStatus, SaveStatusNotice } from "@/components/scripts/save-status-notice";
import { SpeakerManager } from "@/components/scripts/speaker-manager";
import { fetchScriptByIdForOwner, updateScriptTitle } from "@/lib/firebase/scripts";
import { ScriptDetail } from "@/types/script";

const formatDateTime = (value: string): string => {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
};

const ScriptSettingsPage = () => {
  const params = useParams<{ scriptId: string }>();
  const { user } = useAuth();
  const [script, setScript] = useState<ScriptDetail | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSafeNotFound, setIsSafeNotFound] = useState(false);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [titleSaveStatus, setTitleSaveStatus] = useState<SaveStatus>("idle");
  const [titleSaveMessage, setTitleSaveMessage] = useState<string | null>(null);

  const scriptId = params.scriptId;

  const loadScript = useCallback(async () => {
    if (!user || !scriptId) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setIsSafeNotFound(false);

    try {
      const scriptData = await fetchScriptByIdForOwner(scriptId, user.uid);

      if (!scriptData) {
        setScript(null);
        setTitleInput("");
        setIsSafeNotFound(true);
        return;
      }

      setScript(scriptData);
      setTitleInput(scriptData.title);
    } catch {
      setErrorMessage("台本の取得に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }, [scriptId, user]);

  useEffect(() => {
    void loadScript();
  }, [loadScript]);

  const handleSaveTitle = async () => {
    const trimmedTitle = titleInput.trim();
    if (!script || !trimmedTitle) {
      return;
    }

    setIsSavingTitle(true);
    setTitleSaveStatus("saving");
    setTitleSaveMessage("タイトルを保存しています...");
    setErrorMessage(null);

    try {
      await updateScriptTitle(script.id, { title: trimmedTitle });
      const nextScript = {
        ...script,
        title: trimmedTitle,
        updatedAt: new Date().toISOString()
      };

      setScript(nextScript);
      setTitleInput(trimmedTitle);
      setTitleSaveStatus("success");
      setTitleSaveMessage("タイトルを保存しました。");
    } catch {
      setTitleSaveStatus("error");
      setTitleSaveMessage("タイトルの保存に失敗しました。");
    } finally {
      setIsSavingTitle(false);
    }
  };

  if (isLoading) {
    return (
      <Box bg="gray.50" minH="100vh" py={10}>
        <Container maxW="4xl">
          <Stack spacing={4} align="center" py={20}>
            <Spinner size="lg" />
            <Text color="gray.600">台本を読み込んでいます...</Text>
          </Stack>
        </Container>
      </Box>
    );
  }

  if (errorMessage) {
    return (
      <Box bg="gray.50" minH="100vh" py={10}>
        <Container maxW="4xl">
          <Stack spacing={4}>
            <Alert status="error" rounded="md">
              <AlertIcon />
              {errorMessage}
            </Alert>
            <Button as={NextLink} href="/scripts" alignSelf="flex-start" variant="outline">
              一覧に戻る
            </Button>
          </Stack>
        </Container>
      </Box>
    );
  }

  if (isSafeNotFound || !script) {
    return (
      <Box bg="gray.50" minH="100vh" py={10}>
        <Container maxW="4xl">
          <Stack spacing={4} bg="white" p={6} rounded="md" borderWidth="1px">
            <Heading size="md">台本編集</Heading>
            <Text color="gray.700">
              対象の台本が見つからないか、アクセス権がありません。
            </Text>
            <Button as={NextLink} href="/scripts" alignSelf="flex-start" variant="outline">
              一覧に戻る
            </Button>
          </Stack>
        </Container>
      </Box>
    );
  }

  return (
    <Box bg="gray.50" minH="100vh" py={10}>
      <Container maxW="4xl">
        <Stack spacing={6}>
          <Stack direction={{ base: "column", sm: "row" }} justify="space-between" align="start">
            <Stack spacing={1}>
              <Heading size="lg">台本基本設定</Heading>
              <Text color="gray.600" fontSize="sm">
                作成日時: {formatDateTime(script.createdAt)} / 更新日時: {formatDateTime(script.updatedAt)}
              </Text>
            </Stack>
            <Stack direction={{ base: "column", sm: "row" }} spacing={3}>
              <Button as={NextLink} href={`/scripts/${script.id}/compose`} colorScheme="teal">
                会話作成ページへ進む
              </Button>
              <Button as={NextLink} href="/scripts" variant="outline">
                一覧に戻る
              </Button>
            </Stack>
          </Stack>

          <Box bg="white" p={6} rounded="md" borderWidth="1px">
            <Stack spacing={4}>
              <Heading size="md">台本基本情報</Heading>
              <SaveStatusNotice status={titleSaveStatus} message={titleSaveMessage} />
              <FormControl isRequired>
                <FormLabel>タイトル</FormLabel>
                <Input value={titleInput} onChange={(event) => setTitleInput(event.target.value)} maxLength={120} />
              </FormControl>
              <Button
                alignSelf="flex-start"
                colorScheme="teal"
                variant="outline"
                onClick={() => {
                  void handleSaveTitle();
                }}
                isLoading={isSavingTitle}
                isDisabled={!titleInput.trim() || titleInput.trim() === script.title}
              >
                タイトルを保存
              </Button>
            </Stack>
          </Box>

          <Box bg="white" p={6} rounded="md" borderWidth="1px">
            <SpeakerManager scriptId={script.id} />
          </Box>

          <Box bg="white" p={6} rounded="md" borderWidth="1px">
            <Stack spacing={4} align="start">
              <Heading size="md">次のステップ</Heading>
              <Text color="gray.600" fontSize="sm">
                タイトルと話者の設定ができたら、会話作成ページでセリフを追加していきます。
              </Text>
              <Button as={NextLink} href={`/scripts/${script.id}/compose`} colorScheme="teal">
                会話作成ページへ進む
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
};

export default ScriptSettingsPage;
