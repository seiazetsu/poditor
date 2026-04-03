"use client";

import { useCallback, useEffect, useState } from "react";
import NextLink from "next/link";
import { useParams } from "next/navigation";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  FormControl,
  Grid,
  Heading,
  Icon,
  IconButton,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
  Textarea,
  Tooltip
} from "@chakra-ui/react";

import { useAuth } from "@/components/auth/auth-provider";
import {
  createDialogueItem,
  deleteDialogueItem,
  fetchDialogueItems,
  reorderDialogueItems,
  updateDialogueItem
} from "@/lib/firebase/items";
import { fetchScriptByIdForOwner } from "@/lib/firebase/scripts";
import { fetchSpeakers } from "@/lib/firebase/speakers";
import { ScriptDetail, ScriptDialogueItem, ScriptSpeaker } from "@/types/script";

const END_INSERTION = "end";

const InsertIcon = () => (
  <Icon viewBox="0 0 24 24" boxSize={2}>
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

const ListIcon = () => (
  <Icon viewBox="0 0 24 24" boxSize={4}>
    <path
      d="M9 6h10M9 12h10M9 18h10M5 6h.01M5 12h.01M5 18h.01"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Icon>
);

const MinusIcon = () => (
  <Icon viewBox="0 0 24 24" boxSize={4}>
    <path
      d="M6 12h12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Icon>
);

const softenSpeakerColor = (color: string): string => {
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return `${color}26`;
  }

  if (/^#[0-9A-Fa-f]{3}$/.test(color)) {
    const expanded = color
      .slice(1)
      .split("")
      .map((char) => `${char}${char}`)
      .join("");
    return `#${expanded}26`;
  }

  return "gray.100";
};

const getSpeakerInitial = (name: string): string => {
  const trimmedName = name.trim();
  return trimmedName.length > 0 ? trimmedName[0].toUpperCase() : "?";
};

const ScriptComposePage = () => {
  const params = useParams<{ scriptId: string }>();
  const { user } = useAuth();
  const [script, setScript] = useState<ScriptDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [isSafeNotFound, setIsSafeNotFound] = useState(false);
  const [speakers, setSpeakers] = useState<ScriptSpeaker[]>([]);
  const [dialogues, setDialogues] = useState<ScriptDialogueItem[]>([]);
  const [selectedSpeakerId, setSelectedSpeakerId] = useState("");
  const [contentInput, setContentInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [insertionTarget, setInsertionTarget] = useState<number | typeof END_INSERTION>(END_INSERTION);
  const [draggedDialogueId, setDraggedDialogueId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [editingDialogueId, setEditingDialogueId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingDialogueId, setDeletingDialogueId] = useState<string | null>(null);

  const scriptId = params.scriptId;

  const loadScript = useCallback(async () => {
    if (!user || !scriptId) {
      return;
    }

    setIsLoading(true);
    setLoadErrorMessage(null);
    setActionErrorMessage(null);
    setIsSafeNotFound(false);

    try {
      const scriptData = await fetchScriptByIdForOwner(scriptId, user.uid);

      if (!scriptData) {
        setScript(null);
        setIsSafeNotFound(true);
        return;
      }

      const [nextSpeakers, nextDialogues] = await Promise.all([
        fetchSpeakers(scriptId),
        fetchDialogueItems(scriptId)
      ]);

      setScript(scriptData);
      setSpeakers(nextSpeakers);
      setDialogues(nextDialogues);
      setSelectedSpeakerId((prev) => {
        if (prev && nextSpeakers.some((speaker) => speaker.id === prev)) {
          return prev;
        }
        return nextSpeakers[0]?.id ?? "";
      });
    } catch {
      setLoadErrorMessage("台本の取得に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }, [scriptId, user]);

  useEffect(() => {
    void loadScript();
  }, [loadScript]);

  const handleAddDialogue = async () => {
    const trimmedContent = contentInput.trim();
    if (!selectedSpeakerId) {
      setActionErrorMessage("話者を選択してください。");
      return;
    }
    if (!trimmedContent) {
      setActionErrorMessage("セリフ本文を入力してください。");
      return;
    }

    setIsSubmitting(true);
    setActionErrorMessage(null);

    try {
      const maxOrder = dialogues.reduce((max, item) => (item.order > max ? item.order : max), 0);
      const createdId = await createDialogueItem(scriptId, {
        order: dialogues.length === 0 ? 1 : maxOrder + 1,
        speakerId: selectedSpeakerId,
        content: trimmedContent
      });

      if (insertionTarget !== END_INSERTION) {
        const nextIds = dialogues.map((dialogue) => dialogue.id);
        nextIds.splice(insertionTarget, 0, createdId);
        await reorderDialogueItems(scriptId, nextIds);
      }

      setContentInput("");
      setInsertionTarget(END_INSERTION);
      const nextDialogues = await fetchDialogueItems(scriptId);
      setDialogues(nextDialogues);
    } catch {
      setActionErrorMessage("セリフの追加に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDropDialogue = async (targetDialogueId: string) => {
    if (!draggedDialogueId || draggedDialogueId === targetDialogueId) {
      setDraggedDialogueId(null);
      setDropTargetId(null);
      return;
    }

    const sourceIndex = dialogues.findIndex((dialogue) => dialogue.id === draggedDialogueId);
    const targetIndex = dialogues.findIndex((dialogue) => dialogue.id === targetDialogueId);
    if (sourceIndex < 0 || targetIndex < 0) {
      setDraggedDialogueId(null);
      setDropTargetId(null);
      return;
    }

    const reordered = [...dialogues];
    const [movedDialogue] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, movedDialogue);
    const normalized = reordered.map((dialogue, index) => ({
      ...dialogue,
      order: index + 1
    }));

    setDialogues(normalized);
    setDraggedDialogueId(null);
    setDropTargetId(null);
    setActionErrorMessage(null);

    try {
      await reorderDialogueItems(
        scriptId,
        normalized.map((dialogue) => dialogue.id)
      );
    } catch {
      setActionErrorMessage("並び替えの保存に失敗しました。");
      const nextDialogues = await fetchDialogueItems(scriptId);
      setDialogues(nextDialogues);
    }
  };

  const handleStartEdit = (dialogue: ScriptDialogueItem) => {
    setEditingDialogueId(dialogue.id);
    setEditingContent(dialogue.content);
    setActionErrorMessage(null);
  };

  const handleCancelEdit = () => {
    setEditingDialogueId(null);
    setEditingContent("");
  };

  const handleSaveEdit = async (dialogue: ScriptDialogueItem) => {
    const trimmedContent = editingContent.trim();
    if (!trimmedContent) {
      setActionErrorMessage("セリフ本文を入力してください。");
      return;
    }

    setIsSavingEdit(true);
    setActionErrorMessage(null);

    try {
      await updateDialogueItem(scriptId, dialogue.id, {
        speakerId: dialogue.speakerId,
        content: trimmedContent
      });

      setDialogues((prev) =>
        prev.map((item) =>
          item.id === dialogue.id ? { ...item, content: trimmedContent, updatedAt: new Date().toISOString() } : item
        )
      );
      setEditingDialogueId(null);
      setEditingContent("");
    } catch {
      setActionErrorMessage("セリフの更新に失敗しました。");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteDialogue = async (dialogueId: string) => {
    if (!window.confirm("削除しますか？")) {
      return;
    }

    const remainingDialogues = dialogues.filter((dialogue) => dialogue.id !== dialogueId);

    setDeletingDialogueId(dialogueId);
    setDialogues(remainingDialogues.map((dialogue, index) => ({ ...dialogue, order: index + 1 })));
    setDraggedDialogueId(null);
    setDropTargetId(null);
    setActionErrorMessage(null);
    if (editingDialogueId === dialogueId) {
      handleCancelEdit();
    }

    try {
      await deleteDialogueItem(scriptId, dialogueId);
      await reorderDialogueItems(
        scriptId,
        remainingDialogues.map((dialogue) => dialogue.id)
      );
      setInsertionTarget((prev) => {
        if (prev === END_INSERTION) {
          return END_INSERTION;
        }
        return Math.min(prev, remainingDialogues.length);
      });
    } catch {
      setActionErrorMessage("セリフの削除に失敗しました。");
      const nextDialogues = await fetchDialogueItems(scriptId);
      setDialogues(nextDialogues);
    } finally {
      setDeletingDialogueId(null);
    }
  };

  const speakerMap = speakers.reduce<Record<string, ScriptSpeaker>>((acc, speaker) => {
    acc[speaker.id] = speaker;
    return acc;
  }, {});

  if (isLoading) {
    return (
      <Box bg="#fbfcfe" minH="100vh">
        <Stack spacing={4} align="center" py={20}>
          <Spinner size="lg" />
          <Text color="gray.600">会話作成ページを読み込んでいます...</Text>
        </Stack>
      </Box>
    );
  }

  if (loadErrorMessage) {
    return (
      <Box bg="#fbfcfe" minH="100vh" p={6}>
        <Stack spacing={4}>
          <Alert status="error" rounded="md">
            <AlertIcon />
            {loadErrorMessage}
          </Alert>
          <Button as={NextLink} href="/scripts" alignSelf="flex-start" variant="outline">
            一覧に戻る
          </Button>
        </Stack>
      </Box>
    );
  }

  if (isSafeNotFound || !script) {
    return (
      <Box bg="#fbfcfe" minH="100vh" p={6}>
        <Stack spacing={4} bg="white" p={6} rounded="md" borderWidth="1px">
          <Heading size="md">会話作成</Heading>
          <Text color="gray.700">
            対象の台本が見つからないか、アクセス権がありません。
          </Text>
          <Button as={NextLink} href="/scripts" alignSelf="flex-start" variant="outline">
            一覧に戻る
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box bg="#fbfcfe" minH="100vh">
      <Grid templateColumns={{ base: "1fr", lg: "320px minmax(0, 1fr)" }} gap={0} minH="100vh">
        <Box
          bg="white"
          borderRightWidth={{ base: "0", lg: "1px" }}
          borderBottomWidth={{ base: "1px", lg: "0" }}
          p={5}
          h={{ base: "auto", lg: "100vh" }}
          overflowY="auto"
        >
          <Stack spacing={5}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={2}>
                <Tooltip label="基本設定へ戻る" hasArrow>
                  <IconButton
                    as={NextLink}
                    href={`/scripts/${script.id}`}
                    aria-label="基本設定へ戻る"
                    icon={<BackIcon />}
                    variant="outline"
                    rounded="full"
                  />
                </Tooltip>
                <Tooltip label="一覧に戻る" hasArrow>
                  <IconButton
                    as={NextLink}
                    href="/scripts"
                    aria-label="一覧に戻る"
                    icon={<ListIcon />}
                    variant="ghost"
                    rounded="full"
                  />
                </Tooltip>
              </Stack>
              <Text color="gray.700" fontSize="sm" noOfLines={2}>
                {script.title}
              </Text>
            </Stack>

            {actionErrorMessage ? (
              <Alert status="error" rounded="md">
                <AlertIcon />
                {actionErrorMessage}
              </Alert>
            ) : null}

            <FormControl>
              {speakers.length > 0 ? (
                <SimpleGrid columns={5} spacing={2}>
                  {speakers.map((speaker) => {
                    const isSelected = selectedSpeakerId === speaker.id;

                    return (
                      <Tooltip key={speaker.id} label={speaker.name} hasArrow>
                        <Button
                          key={speaker.id}
                          type="button"
                          minW="0"
                          w="28px"
                          h="28px"
                          p="0"
                          variant="ghost"
                          borderWidth="2px"
                          borderColor={isSelected ? speaker.color : "transparent"}
                          bg="transparent"
                          boxShadow="none"
                          onClick={() => setSelectedSpeakerId(speaker.id)}
                          _hover={{ bg: "transparent" }}
                          _active={{ bg: "transparent" }}
                          rounded="full"
                        >
                          <Box
                            w="20px"
                            h="20px"
                            rounded="full"
                            bg={speaker.color}
                            color="white"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            fontWeight="bold"
                            fontSize="2xs"
                            lineHeight="1"
                          >
                            {getSpeakerInitial(speaker.name)}
                          </Box>
                        </Button>
                      </Tooltip>
                    );
                  })}
                </SimpleGrid>
              ) : (
                <Box borderWidth="1px" rounded="md" px={3} py={2} color="gray.500">
                  話者が未登録です
                </Box>
              )}
            </FormControl>

            <FormControl>
              <Textarea
                placeholder="ここにセリフを入力"
                minH="220px"
                resize="vertical"
                value={contentInput}
                onChange={(event) => setContentInput(event.target.value)}
                isDisabled={speakers.length === 0}
              />
            </FormControl>

            {speakers.length === 0 ? (
              <Alert status="warning" rounded="md">
                <AlertIcon />
                話者が未登録です。先に台本基本設定ページで話者を追加してください。
              </Alert>
            ) : null}

            <Button
              colorScheme="teal"
              alignSelf="flex-start"
              onClick={() => {
                void handleAddDialogue();
              }}
              isLoading={isSubmitting}
              isDisabled={speakers.length === 0 || !selectedSpeakerId || !contentInput.trim()}
            >
              セリフを投稿
            </Button>
          </Stack>
        </Box>

        <Box bg="gray.50" h={{ base: "auto", lg: "100vh" }} overflowY="auto" p={{ base: 4, lg: 6 }}>
          <Stack spacing={4} align="stretch" minH="100%">
            {dialogues.length === 0 ? (
              <Box borderWidth="1px" borderStyle="dashed" borderColor="gray.300" rounded="xl" p={6} bg="white">
                <Text color="gray.600">まだセリフはありません。</Text>
              </Box>
            ) : null}

            {dialogues.length > 0 ? (
              <Tooltip label="先頭に挿入" hasArrow>
                <IconButton
                  aria-label="先頭に挿入"
                  icon={<InsertIcon />}
                  alignSelf="flex-start"
                  minW="18px"
                  w="18px"
                  h="18px"
                  p="0"
                  variant={insertionTarget === 0 ? "solid" : "outline"}
                  colorScheme="teal"
                  onClick={() => setInsertionTarget(0)}
                  rounded="full"
                />
              </Tooltip>
            ) : null}

            {dialogues.map((dialogue) => {
              const speaker = speakerMap[dialogue.speakerId];
              const color = speaker?.color ?? "#CBD5E0";
              const name = speaker?.name ?? "話者未設定";
              const currentIndex = dialogues.findIndex((item) => item.id === dialogue.id);
              const isDragged = draggedDialogueId === dialogue.id;
              const isDropTarget = dropTargetId === dialogue.id && !isDragged;
              const isEditing = editingDialogueId === dialogue.id;

              return (
                <Stack key={dialogue.id} spacing={2} align="start">
                  <Tooltip label={`${currentIndex + 1}件目の前に挿入`} hasArrow>
                    <IconButton
                      aria-label={`${currentIndex + 1}件目の前に挿入`}
                      icon={<InsertIcon />}
                      minW="18px"
                      w="18px"
                      h="18px"
                      p="0"
                      variant={insertionTarget === currentIndex ? "solid" : "ghost"}
                      colorScheme="teal"
                      onClick={() => setInsertionTarget(currentIndex)}
                      rounded="full"
                    />
                  </Tooltip>

                  <Stack direction="row" spacing={2} align="center" w="full" maxW="4xl">
                    <Box flex="1 1 auto" minW="0">
                      <Text fontSize="xs" color="gray.500" mb={1} pl={1}>
                        {name}
                      </Text>
                      <Box
                        bg={softenSpeakerColor(color)}
                        rounded="2xl"
                        px={5}
                        py={4}
                        boxShadow={isDropTarget ? "outline" : "sm"}
                        borderWidth="0"
                        opacity={isDragged ? 0.55 : 1}
                        cursor="grab"
                        draggable
                        onDoubleClick={() => handleStartEdit(dialogue)}
                        onDragStart={() => {
                          if (isEditing) {
                            return;
                          }
                          setDraggedDialogueId(dialogue.id);
                          setDropTargetId(null);
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          if (draggedDialogueId && draggedDialogueId !== dialogue.id) {
                            setDropTargetId(dialogue.id);
                          }
                        }}
                        onDragLeave={() => {
                          if (dropTargetId === dialogue.id) {
                            setDropTargetId(null);
                          }
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          void handleDropDialogue(dialogue.id);
                        }}
                        onDragEnd={() => {
                          setDraggedDialogueId(null);
                          setDropTargetId(null);
                        }}
                      >
                        {isEditing ? (
                          <Stack spacing={3}>
                            <Textarea
                              value={editingContent}
                              onChange={(event) => setEditingContent(event.target.value)}
                              minH="120px"
                              resize="vertical"
                              bg="whiteAlpha.700"
                              autoFocus
                            />
                            <Stack direction="row" spacing={2}>
                              <Button
                                size="sm"
                                colorScheme="teal"
                                onClick={() => {
                                  void handleSaveEdit(dialogue);
                                }}
                                isLoading={isSavingEdit}
                              >
                                保存
                              </Button>
                              <Button size="sm" variant="ghost" onClick={handleCancelEdit} isDisabled={isSavingEdit}>
                                キャンセル
                              </Button>
                            </Stack>
                          </Stack>
                        ) : (
                          <Text whiteSpace="pre-wrap" color="gray.900" fontSize="md" lineHeight="tall">
                            {dialogue.content}
                          </Text>
                        )}
                      </Box>
                    </Box>

                    <Tooltip label="削除" hasArrow>
                      <IconButton
                        aria-label="セリフを削除"
                        icon={<MinusIcon />}
                        size="sm"
                        variant="ghost"
                        colorScheme="red"
                        rounded="full"
                        alignSelf="center"
                        onClick={() => {
                          void handleDeleteDialogue(dialogue.id);
                        }}
                        isLoading={deletingDialogueId === dialogue.id}
                        isDisabled={isEditing && isSavingEdit}
                      />
                    </Tooltip>
                  </Stack>
                </Stack>
              );
            })}

            {dialogues.length > 0 ? (
              <Tooltip label="末尾に挿入" hasArrow>
                <IconButton
                  aria-label="末尾に挿入"
                  icon={<InsertIcon />}
                  alignSelf="flex-start"
                  minW="18px"
                  w="18px"
                  h="18px"
                  p="0"
                  variant={insertionTarget === END_INSERTION ? "solid" : "outline"}
                  colorScheme="teal"
                  onClick={() => setInsertionTarget(END_INSERTION)}
                  rounded="full"
                />
              </Tooltip>
            ) : null}

          </Stack>
        </Box>
      </Grid>
    </Box>
  );
};

export default ScriptComposePage;
