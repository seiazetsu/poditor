"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Icon,
  IconButton,
  Input,
  Select,
  Stack,
  Text
} from "@chakra-ui/react";

import { SaveStatus, SaveStatusNotice } from "@/components/scripts/save-status-notice";
import {
  createProjectSpeaker,
  createSpeaker,
  deleteProjectSpeaker,
  deleteSpeaker,
  fetchProjectSpeakers,
  fetchSpeakers,
  updateProjectSpeaker,
  updateSpeaker
} from "@/lib/firebase/speakers";
import { fetchProjectScriptItems, fetchScriptItems } from "@/lib/firebase/items";
import { ScriptSpeaker } from "@/types/script";

type SpeakerManagerProps = {
  scriptId: string;
  projectId?: string;
};

type SpeakerDraft = {
  name: string;
  color: string;
};

type ColorOption = {
  label: string;
  value: string;
};

const colorOptions: ColorOption[] = [
  { label: "ブルー", value: "#1F6FEB" },
  { label: "レッド", value: "#D7263D" },
  { label: "グリーン", value: "#2A9D8F" },
  { label: "オレンジ", value: "#F77F00" },
  { label: "パープル", value: "#6A4C93" },
  { label: "ブラウン", value: "#8D6E63" }
];

const defaultColor = colorOptions[0].value;

const AddIcon = () => (
  <Icon viewBox="0 0 24 24" boxSize={4}>
    <path
      d="M12 5v14M5 12h14"
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

const DeleteIcon = () => (
  <Icon viewBox="0 0 24 24" boxSize={4}>
    <path
      d="M5 7h14M9 7V5h6v2M8 7l1 12h6l1-12"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Icon>
);

const getUsedColorSet = (speakers: ScriptSpeaker[], currentSpeakerId?: string): Set<string> => {
  return new Set(
    speakers
      .filter((speaker) => speaker.id !== currentSpeakerId)
      .map((speaker) => speaker.color)
  );
};

const getFirstAvailableColor = (usedColors: Set<string>): string | null => {
  return colorOptions.find((option) => !usedColors.has(option.value))?.value ?? null;
};

const formatUpdatedAt = (value: string): string => {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
};

export const SpeakerManager = ({ scriptId, projectId }: SpeakerManagerProps) => {
  const [speakers, setSpeakers] = useState<ScriptSpeaker[]>([]);
  const [drafts, setDrafts] = useState<Record<string, SpeakerDraft>>({});
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(defaultColor);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveStatusMessage, setSaveStatusMessage] = useState<string | null>(null);
  const [speakerUsageMap, setSpeakerUsageMap] = useState<Record<string, boolean>>({});

  const syncDrafts = useCallback((nextSpeakers: ScriptSpeaker[]) => {
    const nextDrafts = nextSpeakers.reduce<Record<string, SpeakerDraft>>((acc, speaker) => {
      acc[speaker.id] = { name: speaker.name, color: speaker.color };
      return acc;
    }, {});

    setDrafts(nextDrafts);
  }, []);

  const loadSpeakers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [nextSpeakers, nextItems] = await Promise.all([
        projectId ? fetchProjectSpeakers(projectId, scriptId) : fetchSpeakers(scriptId),
        projectId ? fetchProjectScriptItems(projectId, scriptId) : fetchScriptItems(scriptId)
      ]);
      setSpeakers(nextSpeakers);
      syncDrafts(nextSpeakers);
      setSpeakerUsageMap(
        nextItems.reduce<Record<string, boolean>>((acc, item) => {
          if (item.type === "dialogue" && item.speakerId) {
            acc[item.speakerId] = true;
          }
          return acc;
        }, {})
      );
    } catch {
      setErrorMessage("話者一覧の取得に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }, [projectId, scriptId, syncDrafts]);

  useEffect(() => {
    void loadSpeakers();
  }, [loadSpeakers]);

  const hasSpeakers = useMemo(() => speakers.length > 0, [speakers.length]);
  const usedNewSpeakerColors = useMemo(() => getUsedColorSet(speakers), [speakers]);
  const firstAvailableNewColor = useMemo(
    () => getFirstAvailableColor(usedNewSpeakerColors),
    [usedNewSpeakerColors]
  );
  const hasAvailableNewColor = firstAvailableNewColor !== null;

  useEffect(() => {
    if (!hasAvailableNewColor || !usedNewSpeakerColors.has(newColor)) {
      return;
    }

    setNewColor(firstAvailableNewColor);
  }, [firstAvailableNewColor, hasAvailableNewColor, newColor, usedNewSpeakerColors]);

  const handleAddSpeaker = async () => {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      setErrorMessage("話者名を入力してください。");
      return;
    }
    if (!hasAvailableNewColor) {
      setErrorMessage("選択できる話者色がありません。既存の話者色を見直してください。");
      return;
    }

    setIsAdding(true);
    setErrorMessage(null);
    setSaveStatus("saving");
    setSaveStatusMessage("話者を保存しています...");

    try {
      if (projectId) {
        await createProjectSpeaker(projectId, scriptId, { name: trimmedName, color: newColor });
      } else {
        await createSpeaker(scriptId, { name: trimmedName, color: newColor });
      }
      setNewName("");
      setNewColor(firstAvailableNewColor ?? defaultColor);
      await loadSpeakers();
      setSaveStatus("success");
      setSaveStatusMessage("話者を保存しました。");
    } catch {
      setErrorMessage("話者の追加に失敗しました。");
      setSaveStatus("error");
      setSaveStatusMessage("話者の保存に失敗しました。");
    } finally {
      setIsAdding(false);
    }
  };

  const updateDraft = (speakerId: string, patch: Partial<SpeakerDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [speakerId]: { ...prev[speakerId], ...patch }
    }));
  };

  const handleSaveSpeaker = async (speakerId: string) => {
    const draft = drafts[speakerId];
    if (!draft || !draft.name.trim()) {
      setErrorMessage("話者名を入力してください。");
      return;
    }

    const usedSpeakerColors = getUsedColorSet(speakers, speakerId);
    if (usedSpeakerColors.has(draft.color)) {
      setErrorMessage("その色は他の話者ですでに使用されています。");
      return;
    }

    setSavingIds((prev) => ({ ...prev, [speakerId]: true }));
    setErrorMessage(null);
    setSaveStatus("saving");
    setSaveStatusMessage("話者を更新しています...");

    try {
      if (projectId) {
        await updateProjectSpeaker(projectId, scriptId, speakerId, draft);
      } else {
        await updateSpeaker(scriptId, speakerId, draft);
      }
      await loadSpeakers();
      setSaveStatus("success");
      setSaveStatusMessage("話者を更新しました。");
    } catch {
      setErrorMessage("話者情報の更新に失敗しました。");
      setSaveStatus("error");
      setSaveStatusMessage("話者の更新に失敗しました。");
    } finally {
      setSavingIds((prev) => ({ ...prev, [speakerId]: false }));
    }
  };

  const handleDeleteSpeaker = async (speakerId: string) => {
    if (speakerUsageMap[speakerId]) {
      setErrorMessage("この話者は会話ですでに使用されているため削除できません。");
      return;
    }

    if (!window.confirm("話者を削除しますか？")) {
      return;
    }

    setDeletingIds((prev) => ({ ...prev, [speakerId]: true }));
    setErrorMessage(null);
    setSaveStatus("saving");
    setSaveStatusMessage("話者を削除しています...");

    try {
      if (projectId) {
        await deleteProjectSpeaker(projectId, scriptId, speakerId);
      } else {
        await deleteSpeaker(scriptId, speakerId);
      }
      await loadSpeakers();
      setSaveStatus("success");
      setSaveStatusMessage("話者を削除しました。");
    } catch {
      setErrorMessage("話者の削除に失敗しました。");
      setSaveStatus("error");
      setSaveStatusMessage("話者の削除に失敗しました。");
    } finally {
      setDeletingIds((prev) => ({ ...prev, [speakerId]: false }));
    }
  };

  return (
    <Stack spacing={4}>
      <Heading size="md">話者管理</Heading>
      <Text color="gray.600">収録中に見分けやすいよう、話者名と色を設定してください。</Text>

      {errorMessage ? (
        <Alert status="error" rounded="md">
          <AlertIcon />
          {errorMessage}
        </Alert>
      ) : null}

      <SaveStatusNotice status={saveStatus} message={saveStatusMessage} />

      <Box borderWidth="1px" rounded="md" p={4}>
        <Stack spacing={3}>
          <Heading size="sm">話者を追加</Heading>
          <Flex direction={{ base: "column", lg: "row" }} gap={4} align={{ base: "stretch", lg: "end" }}>
            <FormControl isRequired flex="1 1 0">
              <FormLabel>話者名</FormLabel>
              <Input
                placeholder="例: MC"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                maxLength={40}
              />
            </FormControl>
            <FormControl flex="1 1 0">
              <FormLabel>表示色</FormLabel>
              <Select value={newColor} onChange={(event) => setNewColor(event.target.value)}>
                {colorOptions.map((option) => (
                  <option key={option.value} value={option.value} disabled={usedNewSpeakerColors.has(option.value)}>
                    {option.label}
                    {usedNewSpeakerColors.has(option.value) ? "（使用中）" : ""}
                  </option>
                ))}
              </Select>
            </FormControl>
            <IconButton
              aria-label="話者を追加"
              icon={<AddIcon />}
              colorScheme="teal"
              onClick={handleAddSpeaker}
              isLoading={isAdding}
              isDisabled={!newName.trim() || !hasAvailableNewColor}
              alignSelf={{ base: "stretch", lg: "end" }}
              rounded="full"
            />
          </Flex>
          {!hasAvailableNewColor ? (
            <Text fontSize="sm" color="orange.600">
              すべての色が使用中です。新しい話者を追加するには既存の話者色を変更してください。
            </Text>
          ) : null}
        </Stack>
      </Box>

      {isLoading ? (
        <Box borderWidth="1px" rounded="md" p={4}>
          <Text color="gray.600">話者を読み込んでいます...</Text>
        </Box>
      ) : null}

      {!isLoading && !hasSpeakers ? (
        <Box borderWidth="1px" rounded="md" p={4}>
          <Text color="gray.700">話者はまだ登録されていません。</Text>
        </Box>
      ) : null}

      {!isLoading && (
        <Stack spacing={4}>
          {speakers.map((speaker) => {
          const draft = drafts[speaker.id] ?? { name: speaker.name, color: speaker.color };
          const isSaving = !!savingIds[speaker.id];
          const isDeleting = !!deletingIds[speaker.id];
          const usedSpeakerColors = getUsedColorSet(speakers, speaker.id);

          return (
            <Box key={speaker.id} borderWidth="1px" rounded="md" p={4}>
              <Stack spacing={3}>
                <Flex justify="space-between" align="center" gap={3} wrap="wrap">
                  <Badge
                    px={3}
                    py={1}
                    borderRadius="full"
                    colorScheme="blackAlpha"
                    bg={draft.color}
                    color="white"
                  >
                    {draft.name || "名前未入力"}
                  </Badge>
                  <Text fontSize="sm" color="gray.500">
                    更新: {formatUpdatedAt(speaker.updatedAt)}
                  </Text>
                </Flex>

                <Flex direction={{ base: "column", lg: "row" }} gap={4} align={{ base: "stretch", lg: "end" }}>
                  <FormControl isRequired flex="1 1 0">
                    <FormLabel>話者名</FormLabel>
                    <Input
                      value={draft.name}
                      onChange={(event) => updateDraft(speaker.id, { name: event.target.value })}
                      maxLength={40}
                    />
                  </FormControl>

                  <FormControl flex="1 1 0">
                    <FormLabel>表示色</FormLabel>
                    <Select
                      value={draft.color}
                      onChange={(event) => updateDraft(speaker.id, { color: event.target.value })}
                    >
                      {colorOptions.map((option) => (
                        <option
                          key={option.value}
                          value={option.value}
                          disabled={usedSpeakerColors.has(option.value)}
                        >
                          {option.label}
                          {usedSpeakerColors.has(option.value) ? "（使用中）" : ""}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                  <IconButton
                    aria-label="話者情報を保存"
                    icon={<SaveIcon />}
                    variant="outline"
                    colorScheme="teal"
                    onClick={() => {
                      void handleSaveSpeaker(speaker.id);
                    }}
                    isLoading={isSaving}
                    isDisabled={!draft.name.trim() || isDeleting}
                    alignSelf={{ base: "stretch", lg: "end" }}
                    rounded="full"
                  />
                  <IconButton
                    aria-label="話者を削除"
                    icon={<DeleteIcon />}
                    variant="ghost"
                    colorScheme="red"
                    onClick={() => {
                      void handleDeleteSpeaker(speaker.id);
                    }}
                    isLoading={isDeleting}
                    isDisabled={isSaving}
                    alignSelf={{ base: "stretch", lg: "end" }}
                    rounded="full"
                  />
                </Flex>
              </Stack>
            </Box>
          );
          })}
        </Stack>
      )}
    </Stack>
  );
};
