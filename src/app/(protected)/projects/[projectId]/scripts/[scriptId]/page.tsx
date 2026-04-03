"use client";

import { useCallback, useEffect, useState } from "react";
import NextLink from "next/link";
import { useParams } from "next/navigation";
import {
  Alert,
  AlertIcon,
  Box,
  Container,
  FormControl,
  FormLabel,
  Grid,
  Heading,
  Icon,
  IconButton,
  Input,
  Link,
  Spinner,
  Stack,
  Text,
  Tooltip
} from "@chakra-ui/react";

import { SaveStatus, SaveStatusNotice } from "@/components/scripts/save-status-notice";
import { SpeakerManager } from "@/components/scripts/speaker-manager";
import { useAuth } from "@/components/auth/auth-provider";
import { fetchProjectByIdForUser } from "@/lib/firebase/projects";
import { fetchProjectScriptById, updateProjectScriptTitle } from "@/lib/firebase/scripts";
import { ScriptDetail } from "@/types/script";

const CopyIcon = () => (
  <Icon viewBox="0 0 24 24" boxSize={4}>
    <path
      d="M9 9h10v11H9zM5 5h10v2M5 5v11h2"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Icon>
);

const BackIcon = () => (
  <Icon viewBox="0 0 24 24" boxSize={4}>
    <path
      d="M15 6l-6 6 6 6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Icon>
);

const ComposeIcon = () => (
  <Icon viewBox="0 0 24 24" boxSize={4}>
    <path
      d="M5 12h14M15 8l4 4-4 4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Icon>
);

const SaveIcon = () => (
  <Icon viewBox="0 0 24 24" boxSize={4}>
    <path
      d="M5 5h11l3 3v11H5V5Zm3 0v5h6V5M8 19v-5h8v5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Icon>
);

const formatDateTime = (value: string): string => {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
};

const ProjectScriptSettingsPage = () => {
  const params = useParams<{ projectId: string; scriptId: string }>();
  const { user } = useAuth();
  const [script, setScript] = useState<ScriptDetail | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSafeNotFound, setIsSafeNotFound] = useState(false);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [titleSaveStatus, setTitleSaveStatus] = useState<SaveStatus>("idle");
  const [titleSaveMessage, setTitleSaveMessage] = useState<string | null>(null);

  const projectId = params.projectId;
  const scriptId = params.scriptId;

  const loadScript = useCallback(async () => {
    if (!user || !projectId || !scriptId) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setIsSafeNotFound(false);

    try {
      const project = await fetchProjectByIdForUser(projectId, user.uid);
      if (!project) {
        setIsSafeNotFound(true);
        setScript(null);
        setTitleInput("");
        return;
      }

      const scriptData = await fetchProjectScriptById(projectId, scriptId);

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
  }, [projectId, scriptId, user]);

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
      await updateProjectScriptTitle(projectId, script.id, { title: trimmedTitle });
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

  const handleCopyReferences = async () => {
    if (!script || script.references.length === 0 || typeof navigator === "undefined") {
      return;
    }

    const copyText = script.references
      .map((reference) => [reference.text.trim(), reference.url.trim()].filter(Boolean).join("\n"))
      .join("\n\n");

    if (!copyText) {
      return;
    }

    await navigator.clipboard.writeText(copyText);
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
            <Tooltip label="一覧に戻る" hasArrow>
              <IconButton
                as={NextLink}
                href={`/projects/${projectId}`}
                aria-label="一覧に戻る"
                icon={<BackIcon />}
                alignSelf="flex-start"
                variant="outline"
                rounded="full"
              />
            </Tooltip>
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
            <Text color="gray.700">対象の台本が見つからないか、アクセス権がありません。</Text>
            <Tooltip label="一覧に戻る" hasArrow>
              <IconButton
                as={NextLink}
                href={`/projects/${projectId}`}
                aria-label="一覧に戻る"
                icon={<BackIcon />}
                alignSelf="flex-start"
                variant="outline"
                rounded="full"
              />
            </Tooltip>
          </Stack>
        </Container>
      </Box>
    );
  }

  return (
    <Box bg="gray.50" minH="100vh" py={10}>
      <Container maxW="7xl">
        <Stack spacing={6}>
          <Stack direction={{ base: "column", sm: "row" }} justify="space-between" align="start">
            <Stack direction="row" spacing={3} align="flex-start">
              <Tooltip label="一覧に戻る" hasArrow>
                <IconButton
                  as={NextLink}
                  href={`/projects/${projectId}`}
                  aria-label="一覧に戻る"
                  icon={<BackIcon />}
                  variant="outline"
                  rounded="full"
                  mt={{ base: 0, sm: 1 }}
                />
              </Tooltip>
              <Stack spacing={1}>
                <Heading size="lg">台本基本設定</Heading>
                <Text color="gray.600" fontSize="sm">
                  作成日時: {formatDateTime(script.createdAt)} / 更新日時: {formatDateTime(script.updatedAt)}
                </Text>
              </Stack>
            </Stack>
            <Tooltip label="会話作成ページへ進む" hasArrow>
              <IconButton
                as={NextLink}
                href={`/projects/${projectId}/scripts/${script.id}/compose`}
                aria-label="会話作成ページへ進む"
                icon={<ComposeIcon />}
                colorScheme="teal"
                rounded="full"
              />
            </Tooltip>
          </Stack>

          <Grid templateColumns={{ base: "1fr", xl: "minmax(0, 1.15fr) minmax(360px, 0.85fr)" }} gap={6} alignItems="start">
            <Stack spacing={6}>
              <Box bg="white" p={6} rounded="md" borderWidth="1px">
                <Stack spacing={4}>
                  <Heading size="md">台本基本情報</Heading>
                  <SaveStatusNotice status={titleSaveStatus} message={titleSaveMessage} />
                  <FormControl isRequired>
                    <FormLabel>タイトル</FormLabel>
                    <Input value={titleInput} onChange={(event) => setTitleInput(event.target.value)} maxLength={120} />
                  </FormControl>
                  <Tooltip label="タイトルを保存" hasArrow>
                    <IconButton
                      aria-label="タイトルを保存"
                      icon={<SaveIcon />}
                      alignSelf="flex-start"
                      colorScheme="teal"
                      variant="outline"
                      onClick={() => void handleSaveTitle()}
                      isLoading={isSavingTitle}
                      isDisabled={!titleInput.trim() || titleInput.trim() === script.title}
                      rounded="full"
                    />
                  </Tooltip>
                </Stack>
              </Box>

              <Box bg="white" p={6} rounded="md" borderWidth="1px">
                <SpeakerManager projectId={projectId} scriptId={script.id} />
              </Box>
            </Stack>

            <Box bg="white" p={6} rounded="md" borderWidth="1px">
              <Stack spacing={4}>
                <Stack direction="row" justify="space-between" align="center">
                  <Heading size="md">参考文献</Heading>
                  {script.references.length > 0 ? (
                    <Tooltip label="参考文献をすべてコピー" hasArrow>
                      <IconButton
                        aria-label="参考文献をすべてコピー"
                        icon={<CopyIcon />}
                        size="sm"
                        variant="ghost"
                        rounded="full"
                        onClick={() => void handleCopyReferences()}
                      />
                    </Tooltip>
                  ) : null}
                </Stack>
                {script.references.length === 0 ? (
                  <Text color="gray.500">まだ参考文献はありません。</Text>
                ) : (
                  <Stack spacing={5}>
                    {script.references.map((reference) => (
                      <Stack key={reference.id} spacing={1}>
                        {reference.text ? (
                          <Text color="gray.800" whiteSpace="pre-wrap" userSelect="text">
                            {reference.text}
                          </Text>
                        ) : null}
                        {reference.url ? (
                          <Link href={reference.url} color="teal.600" isExternal wordBreak="break-all" userSelect="text">
                            {reference.url}
                          </Link>
                        ) : null}
                      </Stack>
                    ))}
                  </Stack>
                )}
              </Stack>
            </Box>
          </Grid>
        </Stack>
      </Container>
    </Box>
  );
};

export default ProjectScriptSettingsPage;
