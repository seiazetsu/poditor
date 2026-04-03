"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Link,
  Select,
  Stack,
  Text,
  Textarea
} from "@chakra-ui/react";

import { SaveStatus, SaveStatusNotice } from "@/components/scripts/save-status-notice";
import {
  createDialogueItem,
  createMediaItem,
  deleteScriptItem,
  fetchScriptItems,
  updateDialogueItem,
  updateMediaItem
} from "@/lib/firebase/items";
import { fetchSpeakers } from "@/lib/firebase/speakers";
import {
  ScriptDialogueItem,
  ScriptItem,
  ScriptMediaItem,
  ScriptMediaType,
  ScriptSpeaker
} from "@/types/script";

type DialogueManagerProps = {
  scriptId: string;
};

type SpeakerOption = {
  value: string;
  label: string;
};

type DialogueDraft = {
  type: "dialogue";
  content: string;
  speakerId: string;
};

type MediaDraft = {
  type: "media";
  mediaType: ScriptMediaType;
  label: string;
  url: string;
  note: string;
};

type ItemDraft = DialogueDraft | MediaDraft;

const formatUpdatedAt = (value: string): string => {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
};

const normalizeMediaType = (value: string): ScriptMediaType => {
  return value === "video" ? "video" : "image";
};

export const DialogueManager = ({ scriptId }: DialogueManagerProps) => {
  const [speakers, setSpeakers] = useState<ScriptSpeaker[] | null>(null);
  const [items, setItems] = useState<ScriptItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ItemDraft>>({});
  const [editingDialogueId, setEditingDialogueId] = useState<string | null>(null);
  const [newDialogueSpeakerId, setNewDialogueSpeakerId] = useState("");
  const [newDialogueContent, setNewDialogueContent] = useState("");
  const [newMediaType, setNewMediaType] = useState<ScriptMediaType>("image");
  const [newMediaLabel, setNewMediaLabel] = useState("");
  const [newMediaUrl, setNewMediaUrl] = useState("");
  const [newMediaNote, setNewMediaNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingDialogue, setIsAddingDialogue] = useState(false);
  const [isAddingMedia, setIsAddingMedia] = useState(false);
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveStatusMessage, setSaveStatusMessage] = useState<string | null>(null);

  const speakerMap = useMemo(() => {
    return (speakers ?? []).reduce<Record<string, ScriptSpeaker>>((acc, speaker) => {
      acc[speaker.id] = speaker;
      return acc;
    }, {});
  }, [speakers]);

  const speakerOptions = useMemo<SpeakerOption[]>(() => {
    const options = (speakers ?? []).map((speaker) => ({
      value: speaker.id,
      label: speaker.name
    }));

    return options;
  }, [speakers]);

  const isSpeakersLoading = speakers === null;
  const hasSpeakerData = speakerOptions.length > 0;

  const syncDrafts = useCallback((nextItems: ScriptItem[]) => {
    const nextDrafts = nextItems.reduce<Record<string, ItemDraft>>((acc, item) => {
      if (item.type === "dialogue") {
        acc[item.id] = {
          type: "dialogue",
          content: item.content,
          speakerId: item.speakerId
        };
      } else if (item.type === "media") {
        acc[item.id] = {
          type: "media",
          mediaType: item.mediaType,
          label: item.label,
          url: item.url,
          note: item.note
        };
      }
      return acc;
    }, {});

    setDrafts(nextDrafts);
  }, []);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextItems = await fetchScriptItems(scriptId);
      setItems(nextItems);
      syncDrafts(nextItems);
      setEditingDialogueId((prev) => {
        if (!prev) {
          return prev;
        }

        return nextItems.some((item) => item.id === prev && item.type === "dialogue") ? prev : null;
      });
    } catch {
      setErrorMessage("本文行の取得に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }, [scriptId, syncDrafts]);

  useEffect(() => {
    if (!scriptId) {
      return;
    }

    let cancelled = false;

    const loadSpeakers = async () => {
      setSpeakers(null);
      setErrorMessage(null);

      try {
        const nextSpeakers = await fetchSpeakers(scriptId);
        console.log("Fetched speakers:", nextSpeakers);

        if (cancelled) {
          return;
        }

        setSpeakers(nextSpeakers);
      } catch {
        if (!cancelled) {
          setErrorMessage("話者一覧の取得に失敗しました。");
          setSpeakers([]);
        }
      }
    };

    void loadSpeakers();

    return () => {
      cancelled = true;
    };
  }, [scriptId]);

  useEffect(() => {
    if (!scriptId) {
      return;
    }

    void loadItems();
  }, [loadItems, scriptId]);

  useEffect(() => {
    console.log("Speaker select options:", speakerOptions);
  }, [speakerOptions]);

  useEffect(() => {
    if (!hasSpeakerData) {
      setNewDialogueSpeakerId("");
      return;
    }

    const hasSelectedSpeaker = speakerOptions.some((option) => option.value === newDialogueSpeakerId);
    if (!hasSelectedSpeaker) {
      setNewDialogueSpeakerId(speakerOptions[0].value);
    }
  }, [hasSpeakerData, newDialogueSpeakerId, speakerOptions]);

  const getNextOrder = (): number => {
    if (items.length === 0) {
      return 1;
    }

    const maxOrder = items.reduce((max, item) => (item.order > max ? item.order : max), 0);
    return maxOrder + 1;
  };

  const handleAddDialogue = async () => {
    const trimmedContent = newDialogueContent.trim();
    if (!newDialogueSpeakerId) {
      setErrorMessage("話者を選択してください。");
      return;
    }
    if (!trimmedContent) {
      setErrorMessage("本文を入力してください。");
      return;
    }

    setIsAddingDialogue(true);
    setErrorMessage(null);
    setSaveStatus("saving");
    setSaveStatusMessage("セリフ行を保存しています...");

    try {
      await createDialogueItem(scriptId, {
        order: getNextOrder(),
        speakerId: newDialogueSpeakerId,
        content: trimmedContent
      });
      setNewDialogueContent("");
      await loadItems();
      setSaveStatus("success");
      setSaveStatusMessage("セリフ行を保存しました。");
    } catch {
      setErrorMessage("セリフ行の追加に失敗しました。");
      setSaveStatus("error");
      setSaveStatusMessage("セリフ行の保存に失敗しました。");
    } finally {
      setIsAddingDialogue(false);
    }
  };

  const handleAddMedia = async () => {
    const trimmedUrl = newMediaUrl.trim();
    if (!trimmedUrl) {
      setErrorMessage("メディア URL を入力してください。");
      return;
    }

    setIsAddingMedia(true);
    setErrorMessage(null);
    setSaveStatus("saving");
    setSaveStatusMessage("メディア参照行を保存しています...");

    try {
      await createMediaItem(scriptId, {
        order: getNextOrder(),
        mediaType: newMediaType,
        label: newMediaLabel,
        url: trimmedUrl,
        note: newMediaNote
      });
      setNewMediaType("image");
      setNewMediaLabel("");
      setNewMediaUrl("");
      setNewMediaNote("");
      await loadItems();
      setSaveStatus("success");
      setSaveStatusMessage("メディア参照行を保存しました。");
    } catch {
      setErrorMessage("メディア参照行の追加に失敗しました。");
      setSaveStatus("error");
      setSaveStatusMessage("メディア参照行の保存に失敗しました。");
    } finally {
      setIsAddingMedia(false);
    }
  };

  const updateDialogueDraft = (itemId: string, patch: Partial<DialogueDraft>) => {
    setDrafts((prev) => {
      const current = prev[itemId];
      if (!current || current.type !== "dialogue") {
        return prev;
      }
      return { ...prev, [itemId]: { ...current, ...patch } };
    });
  };

  const resetDialogueDraft = (item: ScriptDialogueItem) => {
    setDrafts((prev) => ({
      ...prev,
      [item.id]: {
        type: "dialogue",
        content: item.content,
        speakerId: item.speakerId
      }
    }));
  };

  const updateMediaDraft = (itemId: string, patch: Partial<MediaDraft>) => {
    setDrafts((prev) => {
      const current = prev[itemId];
      if (!current || current.type !== "media") {
        return prev;
      }
      return { ...prev, [itemId]: { ...current, ...patch } };
    });
  };

  const handleSaveDialogue = async (item: ScriptDialogueItem, draft: DialogueDraft) => {
    if (!draft.speakerId || !draft.content.trim()) {
      setErrorMessage("話者と本文を入力してください。");
      return;
    }

    setSavingIds((prev) => ({ ...prev, [item.id]: true }));
    setErrorMessage(null);
    setSaveStatus("saving");
    setSaveStatusMessage("セリフ行を更新しています...");

    try {
      await updateDialogueItem(scriptId, item.id, {
        speakerId: draft.speakerId,
        content: draft.content
      });
      await loadItems();
      setEditingDialogueId(null);
      setSaveStatus("success");
      setSaveStatusMessage("セリフ行を更新しました。");
    } catch {
      setErrorMessage("セリフ行の更新に失敗しました。");
      setSaveStatus("error");
      setSaveStatusMessage("セリフ行の更新に失敗しました。");
    } finally {
      setSavingIds((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const handleSaveMedia = async (item: ScriptMediaItem, draft: MediaDraft) => {
    if (!draft.url.trim()) {
      setErrorMessage("メディア URL を入力してください。");
      return;
    }

    setSavingIds((prev) => ({ ...prev, [item.id]: true }));
    setErrorMessage(null);
    setSaveStatus("saving");
    setSaveStatusMessage("メディア参照行を更新しています...");

    try {
      await updateMediaItem(scriptId, item.id, {
        mediaType: draft.mediaType,
        label: draft.label,
        url: draft.url,
        note: draft.note
      });
      await loadItems();
      setSaveStatus("success");
      setSaveStatusMessage("メディア参照行を更新しました。");
    } catch {
      setErrorMessage("メディア参照行の更新に失敗しました。");
      setSaveStatus("error");
      setSaveStatusMessage("メディア参照行の更新に失敗しました。");
    } finally {
      setSavingIds((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!window.confirm("この行を削除しますか？")) {
      return;
    }

    setDeletingIds((prev) => ({ ...prev, [itemId]: true }));
    setErrorMessage(null);
    setSaveStatus("saving");
    setSaveStatusMessage("行を削除しています...");

    try {
      await deleteScriptItem(scriptId, itemId);
      await loadItems();
      setSaveStatus("success");
      setSaveStatusMessage("行を削除しました。");
    } catch {
      setErrorMessage("行の削除に失敗しました。");
      setSaveStatus("error");
      setSaveStatusMessage("行の削除に失敗しました。");
    } finally {
      setDeletingIds((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  return (
    <Stack spacing={4}>
      <Heading size="md">本文編集</Heading>
      <Text color="gray.600">
        セリフ行とメディア参照行を同じ流れで管理します。表示順は order に基づきます。
      </Text>

      {errorMessage ? (
        <Alert status="error" rounded="md">
          <AlertIcon />
          {errorMessage}
        </Alert>
      ) : null}

      <SaveStatusNotice status={saveStatus} message={saveStatusMessage} />

      <Box borderWidth="1px" rounded="md" p={4}>
        <Stack spacing={3}>
          <Heading size="sm">セリフ行を追加</Heading>
          {isSpeakersLoading ? (
            <Text color="gray.600">話者を読み込んでいます...</Text>
          ) : null}
          {!isSpeakersLoading && !hasSpeakerData ? (
            <Alert status="warning" rounded="md">
              <AlertIcon />
              先に話者を追加してください。
            </Alert>
          ) : null}
          <FormControl isRequired>
            <FormLabel>話者</FormLabel>
            <Select
              value={newDialogueSpeakerId}
              onChange={(event) => setNewDialogueSpeakerId(event.target.value)}
              placeholder="話者を選択"
              isDisabled={isSpeakersLoading || !hasSpeakerData}
            >
              {speakerOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FormControl>
          <FormControl isRequired>
            <FormLabel>本文</FormLabel>
            <Textarea
              value={newDialogueContent}
              onChange={(event) => setNewDialogueContent(event.target.value)}
              placeholder="ここにセリフを入力"
              minH="100px"
            />
          </FormControl>
          <Button
            alignSelf="flex-start"
            colorScheme="teal"
            onClick={handleAddDialogue}
            isLoading={isAddingDialogue}
            isDisabled={!newDialogueSpeakerId || !newDialogueContent.trim() || isSpeakersLoading || !hasSpeakerData}
          >
            セリフ行を追加
          </Button>
        </Stack>
      </Box>

      <Box borderWidth="1px" rounded="md" p={4} bg="orange.50">
        <Stack spacing={3}>
          <Heading size="sm">メディア参照行を追加</Heading>
          <FormControl isRequired>
            <FormLabel>種別</FormLabel>
            <Select value={newMediaType} onChange={(event) => setNewMediaType(normalizeMediaType(event.target.value))}>
              <option value="image">image</option>
              <option value="video">video</option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>ラベル</FormLabel>
            <Input
              value={newMediaLabel}
              onChange={(event) => setNewMediaLabel(event.target.value)}
              placeholder="例: 参照画像1"
            />
          </FormControl>
          <FormControl isRequired>
            <FormLabel>URL</FormLabel>
            <Input
              value={newMediaUrl}
              onChange={(event) => setNewMediaUrl(event.target.value)}
              placeholder="https://..."
            />
          </FormControl>
          <FormControl>
            <FormLabel>補足メモ</FormLabel>
            <Textarea
              value={newMediaNote}
              onChange={(event) => setNewMediaNote(event.target.value)}
              placeholder="補足情報"
              minH="80px"
            />
          </FormControl>
          <Button
            alignSelf="flex-start"
            colorScheme="orange"
            onClick={handleAddMedia}
            isLoading={isAddingMedia}
            isDisabled={!newMediaUrl.trim()}
          >
            メディア参照行を追加
          </Button>
        </Stack>
      </Box>

      {isLoading ? (
        <Box borderWidth="1px" rounded="md" p={4}>
          <Text color="gray.600">本文行を読み込んでいます...</Text>
        </Box>
      ) : null}

      {!isLoading && items.length === 0 ? (
        <Box borderWidth="1px" rounded="md" p={4}>
          <Text color="gray.700">本文行はまだありません。</Text>
        </Box>
      ) : null}

      {!isLoading && items.some((item) => item.type === "dialogue") ? (
        <Heading size="sm">セリフ行一覧</Heading>
      ) : null}

      {!isLoading &&
        items.map((item) => {
          if (item.type === "dialogue") {
            const draft =
              drafts[item.id] && drafts[item.id].type === "dialogue"
                ? (drafts[item.id] as DialogueDraft)
                : ({ type: "dialogue", content: item.content, speakerId: item.speakerId } as const);

            const isEditing = editingDialogueId === item.id;
            const currentSpeaker = speakerMap[item.speakerId];
            const selectedSpeaker = speakerMap[draft.speakerId];
            const color = currentSpeaker?.color ?? selectedSpeaker?.color ?? "#718096";
            const speakerName = currentSpeaker?.name ?? selectedSpeaker?.name ?? "話者未設定";

            return (
              <Box
                key={item.id}
                borderWidth="1px"
                rounded="md"
                p={4}
                borderLeftWidth="8px"
                borderLeftColor={color}
                bg="gray.50"
              >
                <Stack spacing={3}>
                  <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
                    <Stack spacing={1} flex="1">
                      <Badge px={3} py={1} borderRadius="full" bg={color} color="white" alignSelf="flex-start">
                        {speakerName}
                      </Badge>
                      <Text fontSize="sm" color="gray.500">
                        dialogue / order: {item.order} / 更新: {formatUpdatedAt(item.updatedAt)}
                      </Text>
                    </Stack>
                    <Flex gap={2} wrap="wrap">
                      {isEditing ? (
                        <>
                          <Button
                            colorScheme="teal"
                            variant="solid"
                            size="sm"
                            onClick={() => {
                              void handleSaveDialogue(item, draft);
                            }}
                            isLoading={!!savingIds[item.id]}
                            isDisabled={!draft.speakerId || !draft.content.trim()}
                          >
                            保存
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              resetDialogueDraft(item);
                              setEditingDialogueId(null);
                            }}
                          >
                            キャンセル
                          </Button>
                        </>
                      ) : (
                        <Button
                          colorScheme="teal"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            resetDialogueDraft(item);
                            setEditingDialogueId(item.id);
                          }}
                        >
                          編集
                        </Button>
                      )}
                      <Button
                        colorScheme="red"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          void handleDelete(item.id);
                        }}
                        isLoading={!!deletingIds[item.id]}
                      >
                        削除
                      </Button>
                    </Flex>
                  </Flex>

                  {isEditing ? (
                    <>
                      <FormControl isRequired>
                        <FormLabel>話者</FormLabel>
                        <Select
                          value={draft.speakerId}
                          onChange={(event) =>
                            updateDialogueDraft(item.id, { speakerId: event.target.value })
                          }
                          placeholder="話者を選択"
                          isDisabled={isSpeakersLoading || !hasSpeakerData}
                          bg="white"
                        >
                          {speakerOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl isRequired>
                        <FormLabel>本文</FormLabel>
                        <Textarea
                          value={draft.content}
                          onChange={(event) => updateDialogueDraft(item.id, { content: event.target.value })}
                          minH="120px"
                          bg="white"
                        />
                      </FormControl>
                    </>
                  ) : (
                    <Box
                      bg="white"
                      borderWidth="1px"
                      borderColor="gray.200"
                      rounded="md"
                      px={4}
                      py={3}
                    >
                      <Text whiteSpace="pre-wrap" fontSize="lg" lineHeight="tall" color="gray.800">
                        {item.content}
                      </Text>
                    </Box>
                  )}
                </Stack>
              </Box>
            );
          }

          if (item.type !== "media") {
            return null;
          }

          const mediaItem = item as ScriptMediaItem;
          const draft =
            drafts[mediaItem.id] && drafts[mediaItem.id].type === "media"
              ? (drafts[mediaItem.id] as MediaDraft)
              : ({
                  type: "media",
                  mediaType: mediaItem.mediaType,
                  label: mediaItem.label,
                  url: mediaItem.url,
                  note: mediaItem.note
                } as const);

          return (
            <Box
              key={mediaItem.id}
              borderWidth="1px"
              rounded="md"
              p={4}
              borderLeftWidth="8px"
              borderLeftColor="orange.400"
              bg="orange.50"
            >
              <Stack spacing={3}>
                <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
                  <Badge colorScheme="orange" px={3} py={1} borderRadius="full">
                    media / {draft.mediaType}
                  </Badge>
                  <Text fontSize="sm" color="gray.500">
                    order: {mediaItem.order} / 更新: {formatUpdatedAt(mediaItem.updatedAt)}
                  </Text>
                </Flex>

                <FormControl isRequired>
                  <FormLabel>種別</FormLabel>
                  <Select
                    value={draft.mediaType}
                    onChange={(event) =>
                      updateMediaDraft(mediaItem.id, { mediaType: normalizeMediaType(event.target.value) })
                    }
                  >
                    <option value="image">image</option>
                    <option value="video">video</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>ラベル</FormLabel>
                  <Input
                    value={draft.label}
                    onChange={(event) => updateMediaDraft(mediaItem.id, { label: event.target.value })}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>URL</FormLabel>
                  <Input
                    value={draft.url}
                    onChange={(event) => updateMediaDraft(mediaItem.id, { url: event.target.value })}
                  />
                </FormControl>

                {draft.url ? (
                  <Link href={draft.url} color="orange.700" isExternal>
                    参照URLを開く
                  </Link>
                ) : null}

                <FormControl>
                  <FormLabel>補足メモ</FormLabel>
                  <Textarea
                    value={draft.note}
                    onChange={(event) => updateMediaDraft(mediaItem.id, { note: event.target.value })}
                    minH="80px"
                  />
                </FormControl>

                <Flex gap={2} wrap="wrap">
                  <Button
                    colorScheme="orange"
                    variant="outline"
                    onClick={() => {
                      void handleSaveMedia(mediaItem, draft);
                    }}
                    isLoading={!!savingIds[mediaItem.id]}
                    isDisabled={!draft.url.trim()}
                  >
                    保存
                  </Button>
                  <Button
                    colorScheme="red"
                    variant="outline"
                    onClick={() => {
                      void handleDelete(mediaItem.id);
                    }}
                    isLoading={!!deletingIds[mediaItem.id]}
                  >
                    削除
                  </Button>
                </Flex>
              </Stack>
            </Box>
          );
        })}
    </Stack>
  );
};
