"use client";

import { ChangeEvent, DragEvent, KeyboardEvent, MutableRefObject, TouchEvent, useCallback, useEffect, useRef, useState } from "react";
import NextLink from "next/link";
import { useParams } from "next/navigation";
import {
  Alert,
  AlertIcon,
  AspectRatio,
  Box,
  Button,
  FormControl,
  Grid,
  Heading,
  Icon,
  IconButton,
  Image,
  Input,
  Link,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
  Textarea,
  Tooltip
} from "@chakra-ui/react";

import { useAuth } from "@/components/auth/auth-provider";
import {
  createProjectSectionItem,
  createProjectDialogueItem,
  createProjectMediaItem,
  deleteProjectScriptItem,
  fetchProjectScriptItems,
  reorderProjectScriptItems,
  replaceProjectScriptItems,
  updateProjectDialogueItem,
  updateProjectScriptItemSpeaker,
  updateProjectSectionItem
} from "@/lib/firebase/items";
import { fetchProjectByIdForUser } from "@/lib/firebase/projects";
import { canEditProjectContent } from "@/lib/permissions/project";
import {
  fetchProjectScriptById,
  refreshProjectScriptPreview,
  updateProjectScriptEditorMode,
  updateProjectScriptMemoContent,
  updateProjectScriptReferences
} from "@/lib/firebase/scripts";
import { fetchProjectSpeakers } from "@/lib/firebase/speakers";
import { uploadProjectScriptImage } from "@/lib/firebase/storage";
import {
  formatItemsAsScriptText,
  parseScriptText
} from "@/lib/scripts/text-mode";
import {
  ScriptDetail,
  ScriptDialogueItem,
  ScriptItem,
  ScriptMediaItem,
  ScriptReference,
  ScriptSectionItem,
  ScriptSpeaker
} from "@/types/script";
import { ProjectMemberRole } from "@/types/project";

const END_INSERTION = "end";
const FONT_SIZE_STORAGE_KEY = "poditor-compose-font-size-index";
const FONT_SIZE_OPTIONS = ["xs", "sm", "md", "lg", "xl", "2xl"] as const;
const MEMO_OPEN_STORAGE_KEY = "poditor-compose-memo-open";
const MEMO_SPEAKER_ID = "__memo__";
const MEMO_SPEAKER: ScriptSpeaker = {
  id: MEMO_SPEAKER_ID,
  name: "メモ",
  color: "#A0AEC0",
  updatedAt: ""
};

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

const TextSmallerIcon = () => (
  <Text fontSize="xs" fontWeight="bold" lineHeight="1">
    A-
  </Text>
);

const TextLargerIcon = () => (
  <Text fontSize="sm" fontWeight="bold" lineHeight="1">
    A+
  </Text>
);

const MemoIcon = () => (
  <Icon viewBox="0 0 24 24" boxSize={4}>
    <path
      d="M7 4h10a2 2 0 0 1 2 2v12l-4-2-4 2-4-2-2 1V6a2 2 0 0 1 2-2Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M9 8h6M9 11h6"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Icon>
);

const ComposerIcon = () => (
  <Icon viewBox="0 0 24 24" boxSize={4}>
    <path
      d="M5 6h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-4 3v-3H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Icon>
);

const TextModeIcon = () => (
  <Icon viewBox="0 0 24 24" boxSize={4}>
    <path
      d="M7 5h10M7 10h10M7 15h7M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Icon>
);

const PrintIcon = () => (
  <Icon viewBox="0 0 24 24" boxSize={4}>
    <path
      d="M7 9V4h10v5M6 18H5a2 2 0 0 1-2-2v-4a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v4a2 2 0 0 1-2 2h-1M7 14h10v6H7v-6Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M17 12h.01"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Icon>
);

const ExportIcon = () => (
  <Icon viewBox="0 0 24 24" boxSize={4}>
    <path
      d="M12 4v10M8 10l4 4 4-4M5 18h14"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Icon>
);

const PreviewIcon = () => (
  <Icon viewBox="0 0 24 24" boxSize={4}>
    <path
      d="M10 14 21 3M21 3h-6M21 3v6M3 12v7a2 2 0 0 0 2 2h7"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Icon>
);

const ReferenceIcon = () => (
  <Icon viewBox="0 0 24 24" boxSize={4}>
    <path
      d="M8 7h8M8 12h8M8 17h5M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Icon>
);

const HintIcon = () => (
  <Icon viewBox="0 0 24 24" boxSize={4}>
    <path
      d="M12 17v.01M9.1 9a3 3 0 1 1 4.9 2.3c-.8.65-1.6 1.3-1.6 2.7"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Icon>
);

const ScrollToBottomIcon = () => (
  <Icon viewBox="0 0 24 24" boxSize={4}>
    <path
      d="M12 5v10M8 11l4 4 4-4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Icon>
);

const EditIcon = () => (
  <Icon viewBox="0 0 24 24" boxSize={3.5}>
    <path
      d="M4 20h4l10-10-4-4L4 16v4Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M12 6l4 4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Icon>
);

const DeleteIcon = () => (
  <Icon viewBox="0 0 24 24" boxSize={3.5}>
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

const SelectModeIcon = () => (
  <Icon viewBox="0 0 24 24" boxSize={4}>
    <path
      d="M9 11l2 2 4-5M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Icon>
);

const getSpeakerInitial = (name: string): string => {
  const trimmedName = name.trim();
  return trimmedName.length > 0 ? trimmedName[0].toUpperCase() : "?";
};

const normalizeUrl = (value: string): string => value.trim();

const isImageUrl = (url: string): boolean => {
  return /\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i.test(url);
};

const getYouTubeThumbnailUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url);

    if (parsed.hostname === "youtu.be") {
      const id = parsed.pathname.replace("/", "");
      return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
    }

    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
    }
  } catch {
    return null;
  }

  return null;
};

const isVideoUrl = (url: string): boolean => {
  return (
    /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url) ||
    url.includes("youtube.com") ||
    url.includes("youtu.be") ||
    url.includes("vimeo.com")
  );
};

const formatEstimatedDuration = (items: ScriptItem[]): string => {
  const totalCharacters = items.reduce((count, item) => {
    if (item.type !== "dialogue") {
      return count;
    }

    return count + item.content.replace(/\s+/g, "").length;
  }, 0);

  const totalSeconds = Math.max(0, Math.round((totalCharacters / 300) * 60));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `約 ${seconds}秒`;
  }

  if (seconds === 0) {
    return `約 ${minutes}分`;
  }

  return `約 ${minutes}分${seconds}秒`;
};

const getItemPairId = (item: ScriptItem): string | undefined => {
  return "pairId" in item ? item.pairId : undefined;
};

type DisplayBlock = {
  key: string;
  itemIds: string[];
  section?: ScriptSectionItem;
  dialogue?: ScriptDialogueItem;
  mediaItems: ScriptMediaItem[];
  speakerId: string;
  startIndex: number;
};

const getPairedItemIds = (items: ScriptItem[], targetItemId: string): string[] => {
  const targetIndex = items.findIndex((item) => item.id === targetItemId);
  if (targetIndex < 0) {
    return [];
  }

  const targetItem = items[targetIndex];

  const targetPairId = getItemPairId(targetItem);
  if (targetPairId) {
    return items.filter((item) => getItemPairId(item) === targetPairId).map((item) => item.id);
  }

  const previousItem = items[targetIndex - 1];
  const nextItem = items[targetIndex + 1];

  if (
    targetItem.type === "dialogue" &&
    nextItem?.type === "media" &&
    nextItem.speakerId === targetItem.speakerId
  ) {
    return [targetItem.id, nextItem.id];
  }

  if (
    targetItem.type === "media" &&
    previousItem?.type === "dialogue" &&
    previousItem.speakerId === targetItem.speakerId
  ) {
    return [previousItem.id, targetItem.id];
  }

  return [targetItem.id];
};

const buildDisplayBlocks = (items: ScriptItem[]): DisplayBlock[] => {
  const blocks: DisplayBlock[] = [];

  for (let index = 0; index < items.length; index += 1) {
    const currentItem = items[index];

    if (currentItem.type === "dialogue") {
      const mediaItems: ScriptMediaItem[] = [];
      let nextIndex = index + 1;

      while (nextIndex < items.length) {
        const candidate = items[nextIndex];
        if (candidate.type !== "media") {
          break;
        }

        const isPairedMedia =
          (currentItem.pairId && currentItem.pairId === candidate.pairId) ||
          (!currentItem.pairId &&
            !candidate.pairId &&
            mediaItems.length === 0 &&
            candidate.speakerId === currentItem.speakerId);

        if (!isPairedMedia) {
          break;
        }

        mediaItems.push(candidate);
        nextIndex += 1;
      }

      blocks.push({
        key: currentItem.pairId ? `${currentItem.pairId}-${currentItem.id}` : currentItem.id,
        itemIds: [currentItem.id, ...mediaItems.map((item) => item.id)],
        dialogue: currentItem,
        mediaItems,
        speakerId: currentItem.speakerId,
        startIndex: index
      });
      index = nextIndex - 1;
      continue;
    }

    if (currentItem.type === "section") {
      blocks.push({
        key: currentItem.id,
        itemIds: [currentItem.id],
        section: currentItem,
        mediaItems: [],
        speakerId: "",
        startIndex: index
      });
      continue;
    }

    blocks.push({
      key: currentItem.pairId ? `${currentItem.pairId}-${currentItem.id}` : currentItem.id,
      itemIds: [currentItem.id],
      dialogue: undefined,
      mediaItems: [currentItem],
      speakerId: currentItem.speakerId,
      startIndex: index
    });
  }

  return blocks;
};

const ProjectScriptComposePage = () => {
  const params = useParams<{ projectId: string; scriptId: string }>();
  const { user } = useAuth();
  const [script, setScript] = useState<ScriptDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [isSafeNotFound, setIsSafeNotFound] = useState(false);
  const [speakers, setSpeakers] = useState<ScriptSpeaker[]>([]);
  const [items, setItems] = useState<ScriptItem[]>([]);
  const [selectedSpeakerId, setSelectedSpeakerId] = useState("");
  const [inputMode, setInputMode] = useState<"dialogue" | "section">("dialogue");
  const [contentInput, setContentInput] = useState("");
  const [sectionTitleInput, setSectionTitleInput] = useState("");
  const [mediaTypeInput, setMediaTypeInput] = useState<"image" | "video">("image");
  const [mediaUrlInput, setMediaUrlInput] = useState("");
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [isSubmittingDialogue, setIsSubmittingDialogue] = useState(false);
  const [isSubmittingSection, setIsSubmittingSection] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [insertionTarget, setInsertionTarget] = useState<number | typeof END_INSERTION>(END_INSERTION);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [editingDialogueId, setEditingDialogueId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [changingSpeakerBlockKey, setChangingSpeakerBlockKey] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedBlockKeys, setSelectedBlockKeys] = useState<string[]>([]);
  const [lastSelectedBlockKey, setLastSelectedBlockKey] = useState<string | null>(null);
  const [isDeletingSelection, setIsDeletingSelection] = useState(false);
  const [fontSizeIndex, setFontSizeIndex] = useState(0);
  const [isMemoOpen, setIsMemoOpen] = useState(false);
  const [isMobileComposerOpen, setIsMobileComposerOpen] = useState(false);
  const [memoContent, setMemoContent] = useState("");
  const [isSavingMemo, setIsSavingMemo] = useState(false);
  const [isReferencesOpen, setIsReferencesOpen] = useState(false);
  const [referenceTextInput, setReferenceTextInput] = useState("");
  const [referenceUrlInput, setReferenceUrlInput] = useState("");
  const [editingReferenceId, setEditingReferenceId] = useState<string | null>(null);
  const [isSavingReference, setIsSavingReference] = useState(false);
  const [scrollTargetItemId, setScrollTargetItemId] = useState<string | null>(null);
  const [isOpeningPreview, setIsOpeningPreview] = useState(false);
  const [origin, setOrigin] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState<ProjectMemberRole>("member");
  const [textModeInput, setTextModeInput] = useState("");
  const [textModeErrorMessage, setTextModeErrorMessage] = useState<string | null>(null);
  const [isSavingTextMode, setIsSavingTextMode] = useState(false);
  const [isTextModeDirty, setIsTextModeDirty] = useState(false);
  const [isSwitchingEditorMode, setIsSwitchingEditorMode] = useState(false);
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const conversationScrollRef = useRef<HTMLDivElement | null>(null);
  const editingDialogueTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editingSectionTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const blockElementMapRef = useRef<Record<string, HTMLDivElement | null>>({});
  const memoTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const referencesTouchStartRef = useRef<{ x: number; y: number } | null>(null);

  const projectId = params.projectId;
  const scriptId = params.scriptId;
  const canEditScript = canEditProjectContent(currentUserRole);

  const loadScript = useCallback(async () => {
    if (!user || !projectId || !scriptId) {
      return;
    }

    setIsLoading(true);
    setLoadErrorMessage(null);
    setActionErrorMessage(null);
    setIsSafeNotFound(false);

    try {
      const project = await fetchProjectByIdForUser(projectId, user.uid);
      if (!project) {
        setScript(null);
        setIsSafeNotFound(true);
        return;
      }
      setCurrentUserRole(project.currentUserRole);

      const scriptData = await fetchProjectScriptById(projectId, scriptId);
      if (!scriptData) {
        setScript(null);
        setIsSafeNotFound(true);
        return;
      }

      const [nextSpeakers, nextItems] = await Promise.all([
        fetchProjectSpeakers(projectId, scriptId),
        fetchProjectScriptItems(projectId, scriptId)
      ]);

      setScript(scriptData);
      setSpeakers(nextSpeakers);
      setItems(nextItems);
      setMemoContent(scriptData.memoContent);
      setSelectedSpeakerId((prev) => {
        if (
          prev &&
          (prev === MEMO_SPEAKER_ID || nextSpeakers.some((speaker) => speaker.id === prev))
        ) {
          return prev;
        }
        return nextSpeakers[0]?.id ?? MEMO_SPEAKER_ID;
      });
    } catch {
      setLoadErrorMessage("台本の取得に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }, [projectId, scriptId, user]);

  useEffect(() => {
    void loadScript();
  }, [loadScript]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedValue = window.localStorage.getItem(FONT_SIZE_STORAGE_KEY);
    if (!savedValue) {
      return;
    }

    const parsedValue = Number(savedValue);
    if (Number.isInteger(parsedValue) && parsedValue >= 0 && parsedValue < FONT_SIZE_OPTIONS.length) {
      setFontSizeIndex(parsedValue);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(FONT_SIZE_STORAGE_KEY, String(fontSizeIndex));
  }, [fontSizeIndex]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !projectId || !scriptId) {
      return;
    }

    const savedIsOpen = window.localStorage.getItem(`${MEMO_OPEN_STORAGE_KEY}:${projectId}:${scriptId}`);

    setIsMemoOpen(savedIsOpen === "true");
  }, [projectId, scriptId]);

  useEffect(() => {
    if (typeof window === "undefined" || !projectId || !scriptId) {
      return;
    }

    window.localStorage.setItem(`${MEMO_OPEN_STORAGE_KEY}:${projectId}:${scriptId}`, String(isMemoOpen));
  }, [isMemoOpen, projectId, scriptId]);

  useEffect(() => {
    if (!script) {
      return;
    }

    setMemoContent(script.memoContent);
  }, [script]);

  const handleSaveMemo = useCallback(async () => {
    if (!canEditScript || !script || memoContent === script.memoContent || isSavingMemo) {
      return;
    }

    try {
      setIsSavingMemo(true);
      setActionErrorMessage(null);
      await updateProjectScriptMemoContent(projectId, script.id, { memoContent });
      setScript((prev) =>
        prev && prev.id === script.id
          ? {
              ...prev,
              memoContent,
              updatedAt: new Date().toISOString()
            }
          : prev
      );
    } catch {
      setActionErrorMessage("メモの保存に失敗しました。");
    } finally {
      setIsSavingMemo(false);
    }
  }, [canEditScript, isSavingMemo, memoContent, projectId, script]);

  const handleMemoKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && event.shiftKey) {
        event.preventDefault();
        void handleSaveMemo();
      }
    },
    [handleSaveMemo]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleWindowKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (isReferencesOpen) {
        setIsReferencesOpen(false);
        handleCancelReferenceEdit();
      }

      if (isMemoOpen) {
        setIsMemoOpen(false);
      }

      if (isMobileComposerOpen) {
        setIsMobileComposerOpen(false);
      }
    };

    window.addEventListener("keydown", handleWindowKeyDown);

    return () => {
      window.removeEventListener("keydown", handleWindowKeyDown);
    };
  }, [isMemoOpen, isMobileComposerOpen, isReferencesOpen]);

  useEffect(() => {
    if (canEditScript) {
      return;
    }

    setIsMobileComposerOpen(false);
    setIsSelectionMode(false);
    setSelectedBlockKeys([]);
    setIsReferencesOpen(false);
    setIsMemoOpen(false);
  }, [canEditScript]);

  useEffect(() => {
    const textarea = editingDialogueTextareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [editingContent, editingDialogueId]);

  useEffect(() => {
    const textarea = editingSectionTextareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [editingSectionTitle, editingSectionId]);

  useEffect(() => {
    if (!scrollTargetItemId) {
      return;
    }

    const blocks = buildDisplayBlocks(items);
    const targetBlock = blocks.find((block) => block.itemIds.includes(scrollTargetItemId));
    const targetElement = targetBlock ? blockElementMapRef.current[targetBlock.key] : null;

    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: "smooth",
        block: "end"
      });
    }

    setScrollTargetItemId(null);
  }, [items, scrollTargetItemId]);

  useEffect(() => {
    if (!script || script.editorMode !== "text" || isTextModeDirty) {
      return;
    }

    const { text } = formatItemsAsScriptText(items, speakers);
    setTextModeInput(text);
    setTextModeErrorMessage(null);
  }, [isTextModeDirty, items, script, speakers]);

  const handleSaveTextMode = async () => {
    if (!canEditScript || !script) {
      return;
    }

    const parsed = parseScriptText(textModeInput, speakers);
    if (parsed.errors.length > 0) {
      setTextModeErrorMessage(parsed.errors.join("\n"));
      return;
    }

    setIsSavingTextMode(true);
    setTextModeErrorMessage(null);

    try {
      await replaceProjectScriptItems(projectId, scriptId, parsed.blocks);
      const nextItems = await fetchProjectScriptItems(projectId, scriptId);
      setItems(nextItems);
      setScript({
        ...script,
        updatedAt: new Date().toISOString()
      });
      setIsTextModeDirty(false);
    } catch {
      setTextModeErrorMessage("テキスト台本の保存に失敗しました。");
    } finally {
      setIsSavingTextMode(false);
    }
  };

  const handleSwitchEditorMode = async (nextMode: "conversation" | "text") => {
    if (!canEditScript || !script || script.editorMode === nextMode) {
      return;
    }

    if (script.editorMode === "text" && isTextModeDirty) {
      const confirmed = window.confirm("未保存のテキスト変更は破棄されます。切り替えますか？");
      if (!confirmed) {
        return;
      }
    }

    setIsSwitchingEditorMode(true);
    setActionErrorMessage(null);
    setTextModeErrorMessage(null);

    try {
      await updateProjectScriptEditorMode(projectId, script.id, { editorMode: nextMode });
      const nextScript = {
        ...script,
        editorMode: nextMode,
        updatedAt: new Date().toISOString()
      };

      setScript(nextScript);

      if (nextMode === "text") {
        const { text } = formatItemsAsScriptText(items, speakers);
        setTextModeInput(text);
        setIsTextModeDirty(false);
      }
    } catch {
      if (nextMode === "text") {
        setTextModeErrorMessage("テキストモードへの切り替えに失敗しました。");
      } else {
        setActionErrorMessage("会話モードへの切り替えに失敗しました。");
      }
    } finally {
      setIsSwitchingEditorMode(false);
    }
  };

  const handleExportTextMode = () => {
    if (typeof window === "undefined" || !script) {
      return;
    }

    const blob = new Blob([textModeInput], { type: "text/plain;charset=utf-8" });
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeTitle = script.title.trim().length > 0 ? script.title.trim() : "script";

    link.href = objectUrl;
    link.download = `${safeTitle}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
  };

  const handleAddDialogue = async () => {
    if (!canEditScript) {
      return;
    }

    const trimmedContent = contentInput.trim();
    const trimmedMediaUrl = normalizeUrl(mediaUrlInput);
    const attachedMediaUrl = mediaTypeInput === "image" ? pendingImageUrl ?? trimmedMediaUrl : trimmedMediaUrl;
    const shouldCreateMedia = attachedMediaUrl.length > 0;

    if (!selectedSpeakerId) {
      setActionErrorMessage("話者を選択してください。");
      return;
    }
    if (!trimmedContent) {
      setActionErrorMessage("セリフ本文を入力してください。");
      return;
    }

    setIsSubmittingDialogue(true);
    setActionErrorMessage(null);

    try {
      const maxOrder = items.reduce((max, item) => (item.order > max ? item.order : max), 0);
      const pairId = shouldCreateMedia ? crypto.randomUUID() : undefined;
      const createdId = await createProjectDialogueItem(projectId, scriptId, {
        order: items.length === 0 ? 1 : maxOrder + 1,
        speakerId: selectedSpeakerId,
        pairId,
        content: trimmedContent
      });
      let createdMediaId: string | null = null;

      if (shouldCreateMedia) {
        createdMediaId = await createProjectMediaItem(projectId, scriptId, {
          order: items.length === 0 ? 2 : maxOrder + 2,
          speakerId: selectedSpeakerId,
          pairId,
          mediaType: mediaTypeInput,
          label: "",
          url: attachedMediaUrl,
          note: ""
        });
      }

      if (insertionTarget !== END_INSERTION) {
        const nextIds = items.map((item) => item.id);
        const idsToInsert = createdMediaId ? [createdId, createdMediaId] : [createdId];
        nextIds.splice(insertionTarget, 0, ...idsToInsert);
        await reorderProjectScriptItems(projectId, scriptId, nextIds);
      }

      setContentInput("");
      setMediaUrlInput("");
      setPendingImageUrl(null);
      setMediaTypeInput("image");
      setInsertionTarget(END_INSERTION);
      setIsMobileComposerOpen(false);
      const nextItems = await fetchProjectScriptItems(projectId, scriptId);
      setScrollTargetItemId(createdMediaId ?? createdId);
      setItems(nextItems);
    } catch {
      setActionErrorMessage("投稿に失敗しました。");
    } finally {
      setIsSubmittingDialogue(false);
    }
  };

  const handleAddSection = async () => {
    if (!canEditScript) {
      return;
    }

    const trimmedTitle = sectionTitleInput.trim();
    if (!trimmedTitle) {
      setActionErrorMessage("セクション名を入力してください。");
      return;
    }

    setIsSubmittingSection(true);
    setActionErrorMessage(null);

    try {
      const maxOrder = items.reduce((max, item) => (item.order > max ? item.order : max), 0);
      const createdId = await createProjectSectionItem(projectId, scriptId, {
        order: items.length === 0 ? 1 : maxOrder + 1,
        title: trimmedTitle
      });

      if (insertionTarget !== END_INSERTION) {
        const nextIds = items.map((item) => item.id);
        nextIds.splice(insertionTarget, 0, createdId);
        await reorderProjectScriptItems(projectId, scriptId, nextIds);
      }

      setSectionTitleInput("");
      setInputMode("dialogue");
      setInsertionTarget(END_INSERTION);
      setIsMobileComposerOpen(false);
      const nextItems = await fetchProjectScriptItems(projectId, scriptId);
      setScrollTargetItemId(createdId);
      setItems(nextItems);
    } catch {
      setActionErrorMessage("セクションの追加に失敗しました。");
    } finally {
      setIsSubmittingSection(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!canEditScript) {
      return;
    }

    setIsUploadingImage(true);
    setActionErrorMessage(null);

    try {
      const uploadedUrl = await uploadProjectScriptImage(projectId, scriptId, file);
      setMediaTypeInput("image");
      setMediaUrlInput("");
      setPendingImageUrl(uploadedUrl);
    } catch (error) {
      if (error instanceof Error && error.message) {
        setActionErrorMessage(error.message);
      } else {
        setActionErrorMessage("画像のアップロードに失敗しました。");
      }
    } finally {
      setIsUploadingImage(false);
      setIsDraggingImage(false);
      if (imageFileInputRef.current) {
        imageFileInputRef.current.value = "";
      }
    }
  };

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    void handleImageUpload(file);
  };

  const handleImageDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingImage(false);

    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }

    void handleImageUpload(file);
  };

  const handleContentInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!canEditScript) {
      return;
    }

    if (event.key !== "Enter" || !event.shiftKey) {
      return;
    }

    event.preventDefault();

    if (
      isSubmittingDialogue ||
      isSubmittingSection ||
      isUploadingImage ||
      !selectedSpeakerId ||
      !contentInput.trim()
    ) {
      return;
    }

    void handleAddDialogue();
  };

  const handleDropItem = async (targetBlockId: string) => {
    if (!canEditScript) {
      setDraggedItemId(null);
      setDropTargetId(null);
      return;
    }

    if (isSelectionMode) {
      setDraggedItemId(null);
      setDropTargetId(null);
      return;
    }

    if (!draggedItemId || draggedItemId === targetBlockId) {
      setDraggedItemId(null);
      setDropTargetId(null);
      return;
    }

    const blocks = buildDisplayBlocks(items);
    const sourceIndex = blocks.findIndex((block) => block.key === draggedItemId);
    const targetIndex = blocks.findIndex((block) => block.key === targetBlockId);
    if (sourceIndex < 0 || targetIndex < 0) {
      setDraggedItemId(null);
      setDropTargetId(null);
      return;
    }

    const reorderedBlocks = [...blocks];
    const [movedBlock] = reorderedBlocks.splice(sourceIndex, 1);
    reorderedBlocks.splice(targetIndex, 0, movedBlock);

    const reorderedIds = reorderedBlocks.flatMap((block) => block.itemIds);
    const itemMap = new Map(items.map((item) => [item.id, item]));
    const normalized = reorderedIds.map((itemId, index) => ({
      ...itemMap.get(itemId)!,
      order: index + 1
    }));

    setItems(normalized);
    setDraggedItemId(null);
    setDropTargetId(null);
    setActionErrorMessage(null);

    try {
      await reorderProjectScriptItems(
        projectId,
        scriptId,
        normalized.map((item) => item.id)
      );
    } catch {
      setActionErrorMessage("並び替えの保存に失敗しました。");
      const nextItems = await fetchProjectScriptItems(projectId, scriptId);
      setItems(nextItems);
    }
  };

  const handleStartEdit = (dialogue: ScriptDialogueItem) => {
    if (!canEditScript) {
      return;
    }

    setEditingDialogueId(dialogue.id);
    setEditingContent(dialogue.content);
    setEditingSectionId(null);
    setEditingSectionTitle("");
    setActionErrorMessage(null);
  };

  const handleStartEditSection = (section: ScriptSectionItem) => {
    if (!canEditScript) {
      return;
    }

    setEditingSectionId(section.id);
    setEditingSectionTitle(section.title);
    setEditingDialogueId(null);
    setEditingContent("");
    setActionErrorMessage(null);
  };

  const handleCancelEdit = () => {
    setEditingDialogueId(null);
    setEditingContent("");
    setEditingSectionId(null);
    setEditingSectionTitle("");
  };

  const handleEditInputKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
    dialogue: ScriptDialogueItem
  ) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (!isSavingEdit) {
        handleCancelEdit();
      }
      return;
    }

    if (event.key === "Enter" && event.shiftKey) {
      event.preventDefault();
      if (!isSavingEdit && editingContent.trim()) {
        void handleSaveEdit(dialogue);
      }
    }
  };

  const handleSaveEdit = async (dialogue: ScriptDialogueItem) => {
    if (!canEditScript) {
      return;
    }

    const trimmedContent = editingContent.trim();
    if (!trimmedContent) {
      setActionErrorMessage("セリフ本文を入力してください。");
      return;
    }

    setIsSavingEdit(true);
    setActionErrorMessage(null);

    try {
      await updateProjectDialogueItem(projectId, scriptId, dialogue.id, {
        speakerId: dialogue.speakerId,
        content: trimmedContent
      });

      setItems((prev) =>
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

  const handleSectionInputKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
    section: ScriptSectionItem
  ) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (!isSavingEdit) {
        handleCancelEdit();
      }
      return;
    }

    if (event.key === "Enter" && event.shiftKey) {
      event.preventDefault();
      if (!isSavingEdit && editingSectionTitle.trim()) {
        void handleSaveSectionEdit(section);
      }
    }
  };

  const handleSaveSectionEdit = async (section: ScriptSectionItem) => {
    if (!canEditScript) {
      return;
    }

    const trimmedTitle = editingSectionTitle.trim();
    if (!trimmedTitle) {
      setActionErrorMessage("セクション名を入力してください。");
      return;
    }

    setIsSavingEdit(true);
    setActionErrorMessage(null);

    try {
      await updateProjectSectionItem(projectId, scriptId, section.id, {
        title: trimmedTitle
      });

      setItems((prev) =>
        prev.map((item) =>
          item.id === section.id && item.type === "section"
            ? { ...item, title: trimmedTitle, updatedAt: new Date().toISOString() }
            : item
        )
      );
      setEditingSectionId(null);
      setEditingSectionTitle("");
    } catch {
      setActionErrorMessage("セクションの更新に失敗しました。");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!canEditScript) {
      return;
    }

    if (!window.confirm("削除しますか？")) {
      return;
    }

    const pairedItemIds = getPairedItemIds(items, itemId);
    const remainingItems = items.filter((item) => !pairedItemIds.includes(item.id));

    setDeletingItemId(itemId);
    setItems(remainingItems.map((item, index) => ({ ...item, order: index + 1 })));
    setDraggedItemId(null);
    setDropTargetId(null);
    setActionErrorMessage(null);
    if (editingDialogueId && pairedItemIds.includes(editingDialogueId)) {
      handleCancelEdit();
    }
    if (editingSectionId && pairedItemIds.includes(editingSectionId)) {
      handleCancelEdit();
    }

    try {
      await Promise.all(
        pairedItemIds.map((pairedItemId) => deleteProjectScriptItem(projectId, scriptId, pairedItemId))
      );
      await reorderProjectScriptItems(
        projectId,
        scriptId,
        remainingItems.map((item) => item.id)
      );
      setInsertionTarget((prev) => {
        if (prev === END_INSERTION) {
          return END_INSERTION;
        }
        return Math.min(prev, remainingItems.length);
      });
    } catch {
      setActionErrorMessage("項目の削除に失敗しました。");
      const nextItems = await fetchProjectScriptItems(projectId, scriptId);
      setItems(nextItems);
    } finally {
      setDeletingItemId(null);
    }
  };

  const handleToggleSelectionMode = () => {
    if (!canEditScript) {
      return;
    }

    setIsSelectionMode((current) => !current);
    setSelectedBlockKeys([]);
    setLastSelectedBlockKey(null);
    setDraggedItemId(null);
    setDropTargetId(null);
  };

  const handleSelectBlock = (blockKey: string, blockIndex: number, isShiftKey: boolean, isMetaKey: boolean) => {
    if (!isSelectionMode) {
      return;
    }

    if (isShiftKey && lastSelectedBlockKey) {
      const blocks = buildDisplayBlocks(items);
      const anchorIndex = blocks.findIndex((block) => block.key === lastSelectedBlockKey);

      if (anchorIndex >= 0) {
        const [start, end] = [anchorIndex, blockIndex].sort((a, b) => a - b);
        const rangeKeys = blocks.slice(start, end + 1).map((block) => block.key);

        setSelectedBlockKeys((current) => Array.from(new Set([...current, ...rangeKeys])));
        setLastSelectedBlockKey(blockKey);
        return;
      }
    }

    if (isMetaKey) {
      setSelectedBlockKeys((current) =>
        current.includes(blockKey) ? current.filter((key) => key !== blockKey) : [...current, blockKey]
      );
      setLastSelectedBlockKey(blockKey);
      return;
    }

    setSelectedBlockKeys((current) =>
      current.includes(blockKey) && current.length === 1 ? [] : [blockKey]
    );
    setLastSelectedBlockKey(blockKey);
  };

  const handleDeleteSelectedBlocks = async () => {
    if (!canEditScript) {
      return;
    }

    if (selectedBlockKeys.length === 0) {
      return;
    }

    if (!window.confirm(`${selectedBlockKeys.length}件削除しますか？`)) {
      return;
    }

    const selectedBlocks = buildDisplayBlocks(items).filter((block) => selectedBlockKeys.includes(block.key));
    const selectedItemIds = Array.from(new Set(selectedBlocks.flatMap((block) => block.itemIds)));
    const remainingItems = items.filter((item) => !selectedItemIds.includes(item.id));

    setIsDeletingSelection(true);
    setItems(remainingItems.map((item, index) => ({ ...item, order: index + 1 })));
    setSelectedBlockKeys([]);
    setLastSelectedBlockKey(null);
    setDraggedItemId(null);
    setDropTargetId(null);
    setActionErrorMessage(null);

    if (editingDialogueId && selectedItemIds.includes(editingDialogueId)) {
      handleCancelEdit();
    }
    if (editingSectionId && selectedItemIds.includes(editingSectionId)) {
      handleCancelEdit();
    }

    try {
      await Promise.all(
        selectedItemIds.map((itemId) => deleteProjectScriptItem(projectId, scriptId, itemId))
      );
      await reorderProjectScriptItems(
        projectId,
        scriptId,
        remainingItems.map((item) => item.id)
      );
      setInsertionTarget((prev) => {
        if (prev === END_INSERTION) {
          return END_INSERTION;
        }
        return Math.min(prev, remainingItems.length);
      });
      setIsSelectionMode(false);
    } catch {
      setActionErrorMessage("選択した項目の削除に失敗しました。");
      const nextItems = await fetchProjectScriptItems(projectId, scriptId);
      setItems(nextItems);
    } finally {
      setIsDeletingSelection(false);
    }
  };

  const handlePrintConversation = () => {
    if (typeof window === "undefined") {
      return;
    }

    window.print();
  };

  const handleOpenPreview = async () => {
    if (!canEditScript) {
      return;
    }

    if (!script || !origin || typeof window === "undefined") {
      return;
    }

    setIsOpeningPreview(true);
    setActionErrorMessage(null);

    try {
      const token = script.previewEnabled && script.previewToken
        ? script.previewToken
        : (await refreshProjectScriptPreview(projectId, script.id)).token;

      if (!script.previewEnabled || script.previewToken !== token) {
        setScript({
          ...script,
          previewEnabled: true,
          previewToken: token,
          previewUpdatedAt: new Date().toISOString()
        });
      }

      window.open(`${origin}/preview/${token}`, "_blank", "noopener,noreferrer");
    } catch {
      setActionErrorMessage("共有プレビューを開けませんでした。");
    } finally {
      setIsOpeningPreview(false);
    }
  };

  const handleScrollConversationToBottom = () => {
    const container = conversationScrollRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth"
    });
  };

  const handlePanelTouchStart = (
    event: TouchEvent<HTMLDivElement>,
    targetRef: MutableRefObject<{ x: number; y: number } | null>
  ) => {
    const touch = event.changedTouches[0];
    targetRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handlePanelTouchEnd = (
    event: TouchEvent<HTMLDivElement>,
    targetRef: MutableRefObject<{ x: number; y: number } | null>,
    onClose: () => void
  ) => {
    const startPoint = targetRef.current;
    targetRef.current = null;

    if (!startPoint) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - startPoint.x;
    const deltaY = Math.abs(touch.clientY - startPoint.y);

    if (deltaX > 72 && deltaY < 72) {
      onClose();
    }
  };

  const handleCycleSpeaker = async (block: DisplayBlock) => {
    if (!canEditScript) {
      return;
    }

    if (speakers.length <= 1) {
      return;
    }

    const currentIndex = speakers.findIndex((speaker) => speaker.id === block.speakerId);
    if (currentIndex < 0) {
      return;
    }

    const nextSpeaker = speakers[(currentIndex + 1) % speakers.length];
    if (!nextSpeaker || nextSpeaker.id === block.speakerId) {
      return;
    }

    setChangingSpeakerBlockKey(block.key);
    setActionErrorMessage(null);

    try {
      await Promise.all(
        block.itemIds.map((itemId) => updateProjectScriptItemSpeaker(projectId, scriptId, itemId, nextSpeaker.id))
      );

      setItems((prev) =>
        prev.map((item) =>
          block.itemIds.includes(item.id)
            ? {
                ...item,
                speakerId: nextSpeaker.id,
                updatedAt: new Date().toISOString()
              }
            : item
        )
      );
    } catch {
      setActionErrorMessage("話者の切り替えに失敗しました。");
    } finally {
      setChangingSpeakerBlockKey(null);
    }
  };

  const handleExportConversation = () => {
    if (typeof window === "undefined" || !script) {
      return;
    }

    const blocks = buildDisplayBlocks(items);
    const exportedText = blocks
      .map((block) => {
        if (block.section) {
          const title = block.section.title.trim();
          return ["------------------------", title, "------------------------"].join("\n");
        }

        const isMemoBlock = block.speakerId === MEMO_SPEAKER_ID;
        const speaker = isMemoBlock ? MEMO_SPEAKER : speakerMap[block.speakerId];
        const speakerName = speaker?.name ?? "話者未設定";
        const lines: string[] = [];
        const hasMedia = block.mediaItems.length > 0;

        if (block.dialogue) {
          if (isMemoBlock) {
            lines.push("*************************");
            lines.push("<メモ>");
            lines.push(block.dialogue.content);
          } else {
            lines.push(`${speakerName}：${block.dialogue.content}`);
          }
        } else if (hasMedia) {
          if (isMemoBlock) {
            lines.push("*************************");
            lines.push("<メモ>");
          } else {
            lines.push(`${speakerName}：`);
          }
        }

        block.mediaItems.forEach((mediaItem) => {
          if (mediaItem.url) {
            lines.push(mediaItem.url);
          }
        });

        if (isMemoBlock) {
          lines.push("*************************");
        }

        return lines.join("\n");
      })
      .filter((blockText) => blockText.trim().length > 0)
      .join("\n\n");

    const blob = new Blob([exportedText], { type: "text/plain;charset=utf-8" });
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeTitle = script.title.trim().length > 0 ? script.title.trim() : "script";

    link.href = objectUrl;
    link.download = `${safeTitle}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
  };

  const handleAddReference = async () => {
    if (!canEditScript) {
      return;
    }

    if (!script) {
      return;
    }

    const trimmedText = referenceTextInput.trim();
    const trimmedUrl = referenceUrlInput.trim();

    if (!trimmedText && !trimmedUrl) {
      setActionErrorMessage("参考文献の文字列またはURLを入力してください。");
      return;
    }

    if (trimmedUrl) {
      try {
        new URL(trimmedUrl);
      } catch {
        setActionErrorMessage("参考文献URLの形式が不正です。");
        return;
      }
    }

    const nextReferences = editingReferenceId
      ? script.references.map((reference) =>
          reference.id === editingReferenceId
            ? {
                ...reference,
                text: trimmedText,
                url: trimmedUrl
              }
            : reference
        )
      : [
          ...script.references,
          {
            id: crypto.randomUUID(),
            text: trimmedText,
            url: trimmedUrl
          }
        ];

    setIsSavingReference(true);
    setActionErrorMessage(null);

    try {
      await updateProjectScriptReferences(projectId, script.id, { references: nextReferences });
      setScript({
        ...script,
        references: nextReferences,
        updatedAt: new Date().toISOString()
      });
      setReferenceTextInput("");
      setReferenceUrlInput("");
      setEditingReferenceId(null);
      setIsReferencesOpen(false);
    } catch {
      setActionErrorMessage("参考文献の登録に失敗しました。");
    } finally {
      setIsSavingReference(false);
    }
  };

  const handleStartEditReference = (reference: ScriptReference) => {
    if (!canEditScript) {
      return;
    }

    setReferenceTextInput(reference.text);
    setReferenceUrlInput(reference.url);
    setEditingReferenceId(reference.id);
    setIsReferencesOpen(true);
    setActionErrorMessage(null);
  };

  const handleCancelReferenceEdit = () => {
    setReferenceTextInput("");
    setReferenceUrlInput("");
    setEditingReferenceId(null);
  };

  const handleDeleteReference = async (referenceId: string) => {
    if (!canEditScript) {
      return;
    }

    if (!script) {
      return;
    }

    if (!window.confirm("参考文献を削除しますか？")) {
      return;
    }

    const nextReferences = script.references.filter((reference) => reference.id !== referenceId);
    setIsSavingReference(true);
    setActionErrorMessage(null);

    try {
      await updateProjectScriptReferences(projectId, script.id, { references: nextReferences });
      setScript({
        ...script,
        references: nextReferences,
        updatedAt: new Date().toISOString()
      });

      if (editingReferenceId === referenceId) {
        handleCancelReferenceEdit();
      }
    } catch {
      setActionErrorMessage("参考文献の削除に失敗しました。");
    } finally {
      setIsSavingReference(false);
    }
  };

  const speakerMap = speakers.reduce<Record<string, ScriptSpeaker>>((acc, speaker) => {
    acc[speaker.id] = speaker;
    return acc;
  }, {});
  const selectableSpeakers = [...speakers, MEMO_SPEAKER];
  const displayBlocks = buildDisplayBlocks(items);
  const contentFontSize = FONT_SIZE_OPTIONS[fontSizeIndex];
  const estimatedDurationLabel = formatEstimatedDuration(items);
  const rightFloatingOffset = isMemoOpen ? "calc(max(320px, 33vw) + 20px)" : "20px";

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
          <Button as={NextLink} href={`/projects/${projectId}`} alignSelf="flex-start" variant="outline">
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
          <Text color="gray.700">対象の台本が見つからないか、アクセス権がありません。</Text>
          <Button as={NextLink} href={`/projects/${projectId}`} alignSelf="flex-start" variant="outline">
            一覧に戻る
          </Button>
        </Stack>
      </Box>
    );
  }

  if (script.editorMode === "text") {
    return (
      <Box bg="#fbfcfe" minH="100vh">
        <style>
          {`
            @media print {
              [data-text-mode-controls="true"],
              [data-text-mode-reference-panel="true"],
              [data-text-mode-edit-area="true"] {
                display: none !important;
              }

              [data-text-mode-print-content="true"] {
                display: block !important;
              }
            }
          `}
        </style>
        <Grid templateColumns={{ base: "1fr", lg: isMemoOpen ? "minmax(0, 1fr) minmax(320px, 33vw)" : "minmax(0, 1fr)" }} minH="100vh">
          <Box bg="white" p={{ base: 4, lg: 6 }} borderRightWidth={isMemoOpen ? "1px" : "0"} position="relative">
            <Stack spacing={5} h="full">
              <Stack direction="row" justify="space-between" align="center">
                <Stack direction="row" spacing={2}>
                  <Tooltip label="一覧に戻る" hasArrow>
                    <IconButton
                      as={NextLink}
                      href={`/projects/${projectId}`}
                      aria-label="一覧に戻る"
                      icon={<ListIcon />}
                      variant="ghost"
                      rounded="full"
                    />
                  </Tooltip>
                  <Tooltip label="基本設定へ戻る" hasArrow>
                    <IconButton
                      as={NextLink}
                      href={`/projects/${projectId}/scripts/${script.id}`}
                      aria-label="基本設定へ戻る"
                      icon={<BackIcon />}
                      variant="outline"
                      rounded="full"
                      display={canEditScript ? "inline-flex" : "none"}
                    />
                  </Tooltip>
                </Stack>
                <Stack direction="row" spacing={2}>
                  <Tooltip label="会話モード" hasArrow>
                    <IconButton
                      aria-label="会話モードへ切り替える"
                      icon={<ComposerIcon />}
                      size="sm"
                      rounded="full"
                      variant="ghost"
                      colorScheme="gray"
                      onClick={() => void handleSwitchEditorMode("conversation")}
                      isLoading={isSwitchingEditorMode}
                    />
                  </Tooltip>
                  <Tooltip label="テキストモード" hasArrow>
                    <IconButton
                      aria-label="テキストモードへ切り替える"
                      icon={<TextModeIcon />}
                      size="sm"
                      rounded="full"
                      variant="solid"
                      colorScheme="teal"
                      isDisabled
                    />
                  </Tooltip>
                </Stack>
              </Stack>

              <Stack spacing={1}>
                <Text color="gray.700" fontSize="sm" fontWeight="bold" noOfLines={2}>
                  {script.title}
                </Text>
              </Stack>

              {textModeErrorMessage ? (
                <Alert status="error" rounded="md">
                  <AlertIcon />
                  <Text whiteSpace="pre-wrap">{textModeErrorMessage}</Text>
                </Alert>
              ) : null}

              <Box flex="1" minH="0" data-text-mode-edit-area="true">
                <Textarea
                  value={textModeInput}
                  onChange={(event) => {
                    setTextModeInput(event.target.value);
                    setIsTextModeDirty(true);
                    setTextModeErrorMessage(null);
                  }}
                  placeholder={"##オープニング\n\n#MC1\nこんにちは\n\n[画像]\nhttps://example.com/image.webp\n\n#メモ\nここにメモを書きます"}
                  h="full"
                  minH={{ base: "60vh", lg: "calc(100vh - 220px)" }}
                  resize="none"
                  fontFamily="mono"
                  fontSize={FONT_SIZE_OPTIONS[fontSizeIndex]}
                  lineHeight="tall"
                  isReadOnly={!canEditScript}
                />
              </Box>

              <Box
                display="none"
                data-text-mode-print-content="true"
                whiteSpace="pre-wrap"
                fontSize={FONT_SIZE_OPTIONS[fontSizeIndex]}
                lineHeight="tall"
              >
                {textModeInput}
              </Box>

              {canEditScript ? (
                <Stack direction={{ base: "column", sm: "row" }} justify="flex-start" align="flex-start">
                  <Button
                    colorScheme="teal"
                    onClick={() => void handleSaveTextMode()}
                    isLoading={isSavingTextMode}
                    isDisabled={!isTextModeDirty}
                  >
                    保存
                  </Button>
                </Stack>
              ) : null}
            </Stack>

            <Box
              position="fixed"
              top={{ base: 4, lg: 6 }}
              right={{ base: 4, lg: rightFloatingOffset }}
              zIndex={20}
              data-text-mode-controls="true"
              sx={{
                "@media print": {
                  display: "none"
                }
              }}
            >
              <Stack spacing={2} align="flex-end">
                <Tooltip
                  hasArrow
                  placement="left"
                  label={
                    <Stack spacing={1} align="start">
                      <Text fontWeight="bold">記法ルール</Text>
                      <Text>#MC名 で会話ブロックを開始</Text>
                      <Text>#メモ でメモを開始</Text>
                      <Text>##セクション名 でセクションを追加</Text>
                      <Text>[画像] の次の行に画像URLを記述</Text>
                      <Text>[URL] の次の行にURLを記述</Text>
                      <Text>次の #... / ##... / [画像] / [URL] が来るまでを同じ本文として扱います</Text>
                    </Stack>
                  }
                >
                  <IconButton
                    aria-label="テキストモードの記法"
                    icon={<HintIcon />}
                    variant="ghost"
                    rounded="full"
                    bg="whiteAlpha.900"
                    boxShadow="md"
                    _hover={{ bg: "white" }}
                  />
                </Tooltip>

                <Tooltip label={isMemoOpen ? "メモを閉じる" : "メモを開く"} hasArrow placement="left">
                  <IconButton
                    aria-label={isMemoOpen ? "メモを閉じる" : "メモを開く"}
                    icon={<MemoIcon />}
                    variant={isMemoOpen ? "solid" : "ghost"}
                    colorScheme="teal"
                    rounded="full"
                    bg={isMemoOpen ? "teal.500" : "whiteAlpha.900"}
                    color={isMemoOpen ? "white" : undefined}
                    boxShadow="md"
                    _hover={{ bg: isMemoOpen ? "teal.600" : "white" }}
                    onClick={() => setIsMemoOpen((current) => !current)}
                  />
                </Tooltip>
              </Stack>
            </Box>

            <Box
              position="fixed"
              top="50%"
              right={{ base: 4, lg: rightFloatingOffset }}
              transform="translateY(-50%)"
              zIndex={20}
              data-text-mode-controls="true"
              sx={{
                "@media print": {
                  display: "none"
                }
              }}
            >
              <Stack
                spacing={1}
                bg="whiteAlpha.950"
                borderWidth="1px"
                borderColor="gray.100"
                rounded="full"
                p={1}
                boxShadow="lg"
              >
                {isReferencesOpen ? (
                  <Box
                    w={{ base: "calc(100vw - 1rem)", lg: "320px" }}
                    bg="white"
                    borderWidth="1px"
                    rounded="xl"
                    boxShadow="lg"
                    p={4}
                    data-text-mode-reference-panel="true"
                    onTouchStart={(event) => handlePanelTouchStart(event, referencesTouchStartRef)}
                    onTouchEnd={(event) =>
                      handlePanelTouchEnd(event, referencesTouchStartRef, () => {
                        setIsReferencesOpen(false);
                        handleCancelReferenceEdit();
                      })
                    }
                  >
                    <Stack spacing={3}>
                      <Input
                        placeholder="参考文献名"
                        value={referenceTextInput}
                        onChange={(event) => setReferenceTextInput(event.target.value)}
                      />
                      <Input
                        placeholder="URL"
                        value={referenceUrlInput}
                        onChange={(event) => setReferenceUrlInput(event.target.value)}
                      />
                      {script.references.length > 0 ? (
                        <Box maxH="180px" overflowY="auto" borderWidth="1px" rounded="md" px={3} py={2}>
                          <Stack spacing={2}>
                            {script.references.map((reference) => (
                              <Stack key={reference.id} direction="row" justify="space-between" align="start" spacing={3}>
                                <Box flex="1 1 auto" minW="0">
                                  {reference.text ? (
                                    <Text fontSize="sm" color="gray.800">
                                      {reference.text}
                                    </Text>
                                  ) : null}
                                  {reference.url ? (
                                    <Link href={reference.url} color="teal.600" isExternal fontSize="sm" wordBreak="break-all">
                                      {reference.url}
                                    </Link>
                                  ) : null}
                                </Box>
                                <Stack direction="row" spacing={1}>
                                  <Tooltip label="編集" hasArrow>
                                    <IconButton
                                      aria-label="参考文献を編集"
                                      size="xs"
                                      icon={<EditIcon />}
                                      variant="ghost"
                                      rounded="full"
                                      onClick={() => handleStartEditReference(reference)}
                                      isDisabled={isSavingReference || !canEditScript}
                                    />
                                  </Tooltip>
                                  <Tooltip label="削除" hasArrow>
                                    <IconButton
                                      aria-label="参考文献を削除"
                                      size="xs"
                                      icon={<DeleteIcon />}
                                      variant="ghost"
                                      colorScheme="red"
                                      rounded="full"
                                      onClick={() => void handleDeleteReference(reference.id)}
                                      isDisabled={isSavingReference || !canEditScript}
                                    />
                                  </Tooltip>
                                </Stack>
                              </Stack>
                            ))}
                          </Stack>
                        </Box>
                      ) : null}
                      {canEditScript ? (
                        <Stack direction="row" justify="flex-end">
                          {editingReferenceId ? (
                            <Button variant="ghost" onClick={handleCancelReferenceEdit} isDisabled={isSavingReference}>
                              キャンセル
                            </Button>
                          ) : null}
                          <Button colorScheme="teal" onClick={() => void handleAddReference()} isLoading={isSavingReference}>
                            {editingReferenceId ? "保存" : "登録"}
                          </Button>
                        </Stack>
                      ) : null}
                    </Stack>
                  </Box>
                ) : null}

                <Tooltip label="共有プレビューを開く" hasArrow>
                  <IconButton
                    aria-label="共有プレビューを開く"
                    icon={<PreviewIcon />}
                    variant="ghost"
                    rounded="full"
                    onClick={() => {
                      if (isTextModeDirty) {
                        setTextModeErrorMessage("共有プレビューを開く前に保存してください。");
                        return;
                      }
                      void handleOpenPreview();
                    }}
                    isLoading={isOpeningPreview}
                  />
                </Tooltip>

                <Tooltip label="テキストを印刷" hasArrow>
                  <IconButton
                    aria-label="テキストを印刷"
                    icon={<PrintIcon />}
                    variant="ghost"
                    rounded="full"
                    onClick={handlePrintConversation}
                  />
                </Tooltip>

                <Tooltip label="テキストを書き出す" hasArrow>
                  <IconButton
                    aria-label="テキストを書き出す"
                    icon={<ExportIcon />}
                    variant="ghost"
                    rounded="full"
                    onClick={handleExportTextMode}
                  />
                </Tooltip>

                <Tooltip label="文字を小さくする" hasArrow>
                  <IconButton
                    aria-label="文字を小さくする"
                    icon={<TextSmallerIcon />}
                    variant="ghost"
                    rounded="full"
                    onClick={() => setFontSizeIndex((current) => Math.max(0, current - 1))}
                    isDisabled={fontSizeIndex === 0}
                  />
                </Tooltip>

                <Tooltip label="文字を大きくする" hasArrow>
                  <IconButton
                    aria-label="文字を大きくする"
                    icon={<TextLargerIcon />}
                    variant="ghost"
                    rounded="full"
                    onClick={() => setFontSizeIndex((current) => Math.min(FONT_SIZE_OPTIONS.length - 1, current + 1))}
                    isDisabled={fontSizeIndex === FONT_SIZE_OPTIONS.length - 1}
                  />
                </Tooltip>
              </Stack>
            </Box>

            <Box
              position="fixed"
              bottom={{ base: 4, lg: 6 }}
              right={{ base: 4, lg: rightFloatingOffset }}
              zIndex={20}
              data-text-mode-controls="true"
              sx={{
                "@media print": {
                  display: "none"
                }
              }}
            >
              <Stack spacing={3} align="flex-end">
                <Tooltip label={isReferencesOpen ? "参考文献登録を閉じる" : "参考文献登録を開く"} hasArrow placement="left">
                  <IconButton
                    aria-label={isReferencesOpen ? "参考文献登録を閉じる" : "参考文献登録を開く"}
                    icon={<ReferenceIcon />}
                    variant={isReferencesOpen ? "solid" : "ghost"}
                    colorScheme="teal"
                    rounded="full"
                    bg={isReferencesOpen ? "teal.500" : "whiteAlpha.900"}
                    color={isReferencesOpen ? "white" : undefined}
                    boxShadow="md"
                    _hover={{ bg: isReferencesOpen ? "teal.600" : "white" }}
                    onClick={() =>
                      setIsReferencesOpen((current) => {
                        const next = !current;
                        if (!next) {
                          handleCancelReferenceEdit();
                        }
                        return next;
                      })
                    }
                  />
                </Tooltip>
              </Stack>
            </Box>
          </Box>

          {isMemoOpen ? (
            <Box
              bg="white"
              borderLeftWidth="1px"
              p={{ base: 4, lg: 6 }}
              overflowY="auto"
              onTouchStart={(event) => {
                const touch = event.touches[0];
                memoTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
              }}
              onTouchEnd={(event) => {
                const touchStart = memoTouchStartRef.current;
                const touch = event.changedTouches[0];
                memoTouchStartRef.current = null;

                if (!touchStart) {
                  return;
                }

                const deltaX = touch.clientX - touchStart.x;
                const deltaY = touch.clientY - touchStart.y;

                if (deltaX > 60 && Math.abs(deltaY) < 40) {
                  setIsMemoOpen(false);
                }
              }}
            >
              <Stack spacing={4}>
                <Heading size="md">メモ</Heading>
                <Textarea
                  value={memoContent}
                  onChange={(event) => setMemoContent(event.target.value)}
                  onKeyDown={handleMemoKeyDown}
                  placeholder="参考情報を自由にメモできます"
                  minH={{ base: "60vh", lg: "calc(100vh - 120px)" }}
                  resize="vertical"
                  readOnly={!canEditScript}
                />
                {canEditScript ? (
                  <Button
                    alignSelf="flex-start"
                    colorScheme="teal"
                    onClick={() => void handleSaveMemo()}
                    isLoading={isSavingMemo}
                    isDisabled={memoContent === (script?.memoContent ?? "")}
                  >
                    保存
                  </Button>
                ) : null}
              </Stack>
            </Box>
          ) : null}
        </Grid>
      </Box>
    );
  }

  return (
    <Box bg="#fbfcfe" minH="100vh">
      <style>
        {`
          @media print {
            [role="tooltip"],
            .chakra-tooltip,
            .chakra-popover__popper {
              display: none !important;
            }
          }
        `}
      </style>
      <Grid
        templateColumns={{
          base: "1fr",
          lg: canEditScript
            ? isMemoOpen
              ? "320px minmax(0, 1fr) minmax(320px, 33vw)"
              : "320px minmax(0, 1fr)"
            : isMemoOpen
              ? "minmax(0, 1fr) minmax(320px, 33vw)"
              : "minmax(0, 1fr)"
        }}
        gap={0}
        minH="100vh"
        sx={{
          "@media print": {
            display: "block"
          }
        }}
      >
        {canEditScript && isMobileComposerOpen ? (
          <Box
            position="fixed"
            inset={0}
            bg="blackAlpha.300"
            zIndex={24}
            display={{ base: "block", lg: "none" }}
            onClick={() => setIsMobileComposerOpen(false)}
          />
        ) : null}

        <Box
          bg="white"
          borderRightWidth={{ base: "0", lg: "1px" }}
          borderBottomWidth={{ base: "1px", lg: "0" }}
          p={{ base: 4, lg: 5 }}
          h={{ base: "78vh", lg: "100vh" }}
          maxH={{ base: "78vh", lg: "none" }}
          overflowY="auto"
          order={{ base: 2, lg: 1 }}
          display={canEditScript ? { base: isMobileComposerOpen ? "block" : "none", lg: "block" } : "none"}
          position={{ base: "fixed", lg: "relative" }}
          left={{ base: 0, lg: "auto" }}
          right={{ base: 0, lg: "auto" }}
          bottom={{ base: 0, lg: "auto" }}
          top={{ base: "auto", lg: "auto" }}
          zIndex={{ base: 25, lg: "auto" }}
          roundedTop={{ base: "2xl", lg: "none" }}
          boxShadow={{ base: "2xl", lg: "none" }}
          sx={{
            "@media print": {
              display: "none"
            }
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <Stack spacing={5}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={2} justify="space-between" align="center">
                <Stack direction="row" spacing={2}>
                  <Tooltip label="一覧に戻る" hasArrow>
                    <IconButton
                      as={NextLink}
                      href={`/projects/${projectId}`}
                      aria-label="一覧に戻る"
                      icon={<ListIcon />}
                      variant="ghost"
                      rounded="full"
                    />
                  </Tooltip>
                  <Tooltip label="基本設定へ戻る" hasArrow>
                    <IconButton
                      as={NextLink}
                      href={`/projects/${projectId}/scripts/${script.id}`}
                      aria-label="基本設定へ戻る"
                      icon={<BackIcon />}
                      variant="outline"
                      rounded="full"
                      display={canEditScript ? "inline-flex" : "none"}
                    />
                  </Tooltip>
                </Stack>
                <Stack direction="row" spacing={2}>
                  <Tooltip label="会話モード" hasArrow>
                    <IconButton
                      aria-label="会話モードへ切り替える"
                      icon={<ComposerIcon />}
                      size="sm"
                      rounded="full"
                      variant="solid"
                      colorScheme="teal"
                      isDisabled
                    />
                  </Tooltip>
                  <Tooltip label="テキストモード" hasArrow>
                    <IconButton
                      aria-label="テキストモードへ切り替える"
                      icon={<TextModeIcon />}
                      size="sm"
                      rounded="full"
                      variant="ghost"
                      colorScheme="gray"
                      onClick={() => void handleSwitchEditorMode("text")}
                      isLoading={isSwitchingEditorMode}
                    />
                  </Tooltip>
                </Stack>
              </Stack>
              <Stack spacing={1}>
                <Text color="gray.700" fontSize="sm" fontWeight="bold" noOfLines={2}>
                  {script.title}
                </Text>
              </Stack>
              <Text color="gray.500" fontSize="xs">
                想定時間: {estimatedDurationLabel}
              </Text>
            </Stack>

            {actionErrorMessage ? (
              <Alert status="error" rounded="md">
                <AlertIcon />
                {actionErrorMessage}
              </Alert>
            ) : null}

            {isSelectionMode ? (
              <Alert status="info" rounded="md">
                <AlertIcon />
                {selectedBlockKeys.length === 0
                  ? "削除したい項目をクリックしてください。Shift+クリックで範囲選択できます。"
                  : `${selectedBlockKeys.length}件を選択中です。`}
              </Alert>
            ) : null}

            {isSelectionMode ? (
              <Stack direction="row" spacing={2}>
                <Button
                  leftIcon={<DeleteIcon />}
                  colorScheme="red"
                  variant="outline"
                  onClick={() => void handleDeleteSelectedBlocks()}
                  isDisabled={selectedBlockKeys.length === 0}
                  isLoading={isDeletingSelection}
                >
                  一括削除
                </Button>
                <Button variant="ghost" onClick={handleToggleSelectionMode} isDisabled={isDeletingSelection}>
                  キャンセル
                </Button>
              </Stack>
            ) : null}

            {!isSelectionMode ? (
              <>
                <FormControl>
                  <Select
                    value={inputMode}
                    onChange={(event) =>
                      setInputMode(event.target.value === "section" ? "section" : "dialogue")
                    }
                  >
                    <option value="dialogue">セリフ入力</option>
                    <option value="section">セクション入力</option>
                  </Select>
                </FormControl>

                {inputMode === "dialogue" ? (
                  <FormControl>
                    {selectableSpeakers.length > 0 ? (
                      <SimpleGrid columns={5} spacing={2}>
                        {selectableSpeakers.map((speaker) => {
                          const isSelected = selectedSpeakerId === speaker.id;

                          return (
                            <Tooltip key={speaker.id} label={speaker.name} hasArrow>
                              <Button
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
                                  color={speaker.id === MEMO_SPEAKER_ID ? "gray.700" : "white"}
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
                ) : null}

                {inputMode === "section" ? (
                  <Stack spacing={3}>
                    <FormControl>
                      <Input
                        placeholder="セクション名を入力"
                        value={sectionTitleInput}
                        onChange={(event) => setSectionTitleInput(event.target.value)}
                      />
                    </FormControl>

                    <Button
                      colorScheme="gray"
                      variant="outline"
                      alignSelf="flex-start"
                      onClick={() => void handleAddSection()}
                      isLoading={isSubmittingSection}
                      isDisabled={!sectionTitleInput.trim() || isSubmittingDialogue}
                    >
                      セクションを追加
                    </Button>
                  </Stack>
                ) : (
                  <>
                    <FormControl>
                      <Textarea
                        placeholder={selectedSpeakerId === MEMO_SPEAKER_ID ? "ここにメモを入力" : "ここにセリフを入力"}
                        minH="220px"
                        resize="vertical"
                        value={contentInput}
                        onChange={(event) => setContentInput(event.target.value)}
                        onKeyDown={handleContentInputKeyDown}
                        isDisabled={speakers.length === 0}
                      />
                    </FormControl>

                    {speakers.length === 0 && selectedSpeakerId !== MEMO_SPEAKER_ID ? (
                      <Alert status="warning" rounded="md">
                        <AlertIcon />
                        話者が未登録です。先に台本基本設定ページで話者を追加してください。
                      </Alert>
                    ) : null}

                    <Stack spacing={3} pt={2} borderTopWidth="1px" borderColor="gray.100">
                      <Select
                        value={mediaTypeInput}
                        onChange={(event) => {
                          const nextType = event.target.value === "video" ? "video" : "image";
                          setMediaTypeInput(nextType);
                          if (nextType === "video") {
                            setPendingImageUrl(null);
                          }
                        }}
                      >
                        <option value="image">画像</option>
                        <option value="video">URL</option>
                      </Select>
                      <Input
                        placeholder={mediaTypeInput === "image" ? "画像 URL" : "URL"}
                        value={mediaUrlInput}
                        onChange={(event) => setMediaUrlInput(event.target.value)}
                      />
                      {mediaTypeInput === "image" ? (
                        <Box
                          borderWidth="1px"
                          borderStyle="dashed"
                          borderColor={isDraggingImage ? "teal.400" : "gray.300"}
                          bg={isDraggingImage ? "teal.50" : "gray.50"}
                          rounded="md"
                          px={4}
                          py={5}
                          textAlign="center"
                          onDragOver={(event) => {
                            event.preventDefault();
                            setIsDraggingImage(true);
                          }}
                          onDragEnter={(event) => {
                            event.preventDefault();
                            setIsDraggingImage(true);
                          }}
                          onDragLeave={(event) => {
                            event.preventDefault();
                            if (event.currentTarget === event.target) {
                              setIsDraggingImage(false);
                            }
                          }}
                          onDrop={handleImageDrop}
                        >
                          <Stack spacing={3} align="center">
                            <Text fontSize="sm" color="gray.600">
                              画像をここにドラッグ&ドロップ
                            </Text>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => imageFileInputRef.current?.click()}
                              isLoading={isUploadingImage}
                            >
                              画像を選択
                            </Button>
                            <Input
                              ref={imageFileInputRef}
                              type="file"
                              accept="image/*"
                              display="none"
                              onChange={handleImageFileChange}
                            />
                          </Stack>
                        </Box>
                      ) : null}
                      {pendingImageUrl ? (
                        <Box borderWidth="1px" rounded="md" p={3} bg="gray.50">
                          <Stack spacing={2}>
                            <Text fontSize="sm" color="gray.600">
                              画像を添付済みです。投稿時にセリフと一緒に追加されます。
                            </Text>
                            <Image src={pendingImageUrl} alt="pending upload" rounded="md" maxH="140px" objectFit="cover" />
                            <Button
                              size="sm"
                              variant="ghost"
                              alignSelf="flex-start"
                              onClick={() => setPendingImageUrl(null)}
                            >
                              添付を外す
                            </Button>
                          </Stack>
                        </Box>
                      ) : null}
                      <Button
                        colorScheme="teal"
                        alignSelf="flex-start"
                        onClick={() => void handleAddDialogue()}
                        isLoading={isSubmittingDialogue}
                        isDisabled={
                          isUploadingImage ||
                          isSubmittingSection ||
                          !selectedSpeakerId ||
                          !contentInput.trim()
                        }
                      >
                        セリフを投稿
                      </Button>
                    </Stack>
                  </>
                )}
              </>
            ) : null}
          </Stack>
        </Box>

        <Box
          ref={conversationScrollRef}
          bg="gray.50"
          h={{ base: "auto", lg: "100vh" }}
          overflowY="auto"
          order={{ base: 1, lg: 2 }}
          p={{ base: 3, lg: 6 }}
          pr={{ base: 14, lg: 20 }}
          position="relative"
          sx={{
            "@media print": {
              bg: "white",
              h: "auto",
              overflow: "visible",
              p: 0
            }
          }}
        >
          <Box
            position="fixed"
            top={{ base: 4, lg: 6 }}
            right={{ base: 4, lg: rightFloatingOffset }}
            zIndex={20}
            display={canEditScript ? "block" : "none"}
            sx={{
              "@media print": {
                display: "none"
              }
            }}
          >
            <Tooltip label={isMemoOpen ? "メモを閉じる" : "メモを開く"} hasArrow>
              <IconButton
                aria-label={isMemoOpen ? "メモを閉じる" : "メモを開く"}
                icon={<MemoIcon />}
                variant={isMemoOpen ? "solid" : "ghost"}
                colorScheme="teal"
                rounded="full"
                onClick={() => setIsMemoOpen((current) => !current)}
                bg={isMemoOpen ? "teal.500" : "whiteAlpha.900"}
                color={isMemoOpen ? "white" : undefined}
                boxShadow="md"
                _hover={{
                  bg: isMemoOpen ? "teal.600" : "white"
                }}
              />
            </Tooltip>
          </Box>

          <Box
            position="fixed"
            bottom={{ base: 20, lg: "auto" }}
            right={{ base: 4, lg: "auto" }}
            zIndex={20}
            display={canEditScript ? { base: "block", lg: "none" } : "none"}
            sx={{
              "@media print": {
                display: "none"
              }
            }}
          >
            <Tooltip label={isMobileComposerOpen ? "投稿ビューを閉じる" : "投稿ビューを開く"} hasArrow placement="left">
              <IconButton
                aria-label={isMobileComposerOpen ? "投稿ビューを閉じる" : "投稿ビューを開く"}
                icon={<ComposerIcon />}
                variant={isMobileComposerOpen ? "solid" : "ghost"}
                colorScheme="teal"
                rounded="full"
                bg={isMobileComposerOpen ? "teal.500" : "whiteAlpha.900"}
                color={isMobileComposerOpen ? "white" : undefined}
                boxShadow="md"
                _hover={{
                  bg: isMobileComposerOpen ? "teal.600" : "white"
                }}
                onClick={() => setIsMobileComposerOpen((current) => !current)}
              />
            </Tooltip>
          </Box>

          <Box
            position="fixed"
            top="50%"
            right={{ base: 4, lg: rightFloatingOffset }}
            transform="translateY(-50%)"
            zIndex={20}
            sx={{
              "@media print": {
                display: "none"
              }
            }}
          >
            <Stack
              spacing={1}
              bg="whiteAlpha.950"
              borderWidth="1px"
              borderColor="gray.100"
              rounded="full"
              p={1}
              boxShadow="lg"
            >
              <Tooltip label="共有プレビューを開く" hasArrow placement="left">
                <IconButton
                  aria-label="共有プレビューを開く"
                  icon={<PreviewIcon />}
                  variant="ghost"
                  rounded="full"
                  onClick={() => void handleOpenPreview()}
                  isLoading={isOpeningPreview}
                  isDisabled={!canEditScript}
                />
              </Tooltip>
              <Tooltip label="会話ビューを印刷" hasArrow placement="left">
                <IconButton
                  aria-label="会話ビューを印刷"
                  icon={<PrintIcon />}
                  variant="ghost"
                  rounded="full"
                  onClick={handlePrintConversation}
                />
              </Tooltip>
              <Tooltip label="テキストでエクスポート" hasArrow placement="left">
                <IconButton
                  aria-label="テキストでエクスポート"
                  icon={<ExportIcon />}
                  variant="ghost"
                  rounded="full"
                  onClick={handleExportConversation}
                />
              </Tooltip>
              <Tooltip label="文字を小さくする" hasArrow placement="left">
                <IconButton
                  aria-label="文字を小さくする"
                  icon={<TextSmallerIcon />}
                  variant="ghost"
                  rounded="full"
                  onClick={() => setFontSizeIndex((current) => Math.max(0, current - 1))}
                  isDisabled={fontSizeIndex === 0}
                />
              </Tooltip>
              <Tooltip label="文字を大きくする" hasArrow placement="left">
                <IconButton
                  aria-label="文字を大きくする"
                  icon={<TextLargerIcon />}
                  variant="ghost"
                  rounded="full"
                  onClick={() =>
                    setFontSizeIndex((current) => Math.min(FONT_SIZE_OPTIONS.length - 1, current + 1))
                  }
                  isDisabled={fontSizeIndex === FONT_SIZE_OPTIONS.length - 1}
                />
              </Tooltip>
              {canEditScript ? (
                <Tooltip label={isSelectionMode ? "選択モードを終了" : "複数選択モード"} hasArrow placement="left">
                  <IconButton
                    aria-label={isSelectionMode ? "選択モードを終了" : "複数選択モード"}
                    icon={<SelectModeIcon />}
                    variant={isSelectionMode ? "solid" : "ghost"}
                    colorScheme="teal"
                    rounded="full"
                    onClick={handleToggleSelectionMode}
                  />
                </Tooltip>
              ) : null}
            </Stack>
          </Box>

          <Box
            position="fixed"
            bottom={{ base: 4, lg: 6 }}
            left={{
              base: "50%",
              lg: isMemoOpen
                ? "calc(320px + ((100vw - 320px - max(320px, 33vw)) / 2))"
                : "calc(320px + ((100vw - 320px) / 2))"
            }}
            transform="translateX(-50%)"
            zIndex={20}
            sx={{
              "@media print": {
                display: "none"
              }
            }}
          >
            <Tooltip label="最下までスクロール" hasArrow>
              <IconButton
                aria-label="最下までスクロール"
                icon={<ScrollToBottomIcon />}
                variant="ghost"
                rounded="full"
                color="blackAlpha.500"
                bg="transparent"
                borderWidth="0"
                boxShadow="none"
                minW="28px"
                w="28px"
                h="28px"
                _hover={{ bg: "blackAlpha.50", color: "blackAlpha.700" }}
                _active={{ bg: "blackAlpha.100", color: "blackAlpha.800" }}
                onClick={handleScrollConversationToBottom}
              />
            </Tooltip>
          </Box>

          <Stack spacing={4} align="stretch" minH="100%">
            {!canEditScript ? (
              <Alert status="info" rounded="md">
                <AlertIcon />
                viewer 権限のため、このページは閲覧専用です。
              </Alert>
            ) : null}

            {items.length === 0 ? (
              <Box borderWidth="1px" borderStyle="dashed" borderColor="gray.300" rounded="xl" p={6} bg="white">
                <Text color="gray.600">まだ項目はありません。</Text>
              </Box>
            ) : null}

            {displayBlocks.length > 0 ? (
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
                  display={canEditScript && !isSelectionMode ? "inline-flex" : "none"}
                  sx={{
                    "@media print": {
                      display: "none"
                    }
                  }}
                />
              </Tooltip>
            ) : null}

       {displayBlocks.map((block, currentIndex) => {
              const blockKey = block.key;
              const section = block.section;
              const dialogue = block.dialogue;
              const speaker = block.speakerId === MEMO_SPEAKER_ID ? MEMO_SPEAKER : speakerMap[block.speakerId];
              const color = speaker?.color ?? "#CBD5E0";
              const name = speaker?.name ?? "話者未設定";
              const isMemoBlock = block.speakerId === MEMO_SPEAKER_ID;
              const isDragged = draggedItemId === blockKey;
              const isDropTarget = dropTargetId === blockKey && !isDragged;
              const isSectionEditing = !!section && editingSectionId === section.id;
              const isEditing = !!dialogue && editingDialogueId === dialogue.id;
              const isChangingSpeaker = changingSpeakerBlockKey === blockKey;
              const isSelectedBlock = selectedBlockKeys.includes(blockKey);

              return (
                <Stack
                  key={blockKey}
                  spacing={2}
                  align="start"
                  ref={(element) => {
                    blockElementMapRef.current[blockKey] = element;
                  }}
                >
                  <Tooltip label={`${currentIndex + 1}件目の前に挿入`} hasArrow>
                    <IconButton
                      aria-label={`${currentIndex + 1}件目の前に挿入`}
                      icon={<InsertIcon />}
                      minW="18px"
                      w="18px"
                      h="18px"
                      p="0"
                      variant={insertionTarget === block.startIndex ? "solid" : "ghost"}
                      colorScheme="teal"
                      onClick={() => setInsertionTarget(block.startIndex)}
                      rounded="full"
                      display={canEditScript && !isSelectionMode ? "inline-flex" : "none"}
                      sx={{
                        "@media print": {
                          display: "none"
                        }
                      }}
                    />
                  </Tooltip>

                  <Stack direction="row" spacing={2} align="center" w="full" maxW="4xl">
                    <Box
                      flex="1 1 auto"
                      minW="0"
                      opacity={isDragged ? 0.55 : 1}
                      cursor={isSelectionMode ? "pointer" : canEditScript ? "grab" : "default"}
                      draggable={!isSelectionMode && canEditScript}
                      onDoubleClick={() => {
                        if (isSelectionMode || !canEditScript) {
                          return;
                        }
                        if (section) {
                          handleStartEditSection(section);
                        }
                        if (dialogue) {
                          handleStartEdit(dialogue);
                        }
                      }}
                      onClick={(event) => {
                        if (!isSelectionMode) {
                          return;
                        }

                        handleSelectBlock(blockKey, currentIndex, event.shiftKey, event.metaKey || event.ctrlKey);
                      }}
                      onDragStart={() => {
                        if (isEditing || isSelectionMode || !canEditScript) {
                          return;
                        }
                        setDraggedItemId(blockKey);
                        setDropTargetId(null);
                      }}
                      onDragOver={(event) => {
                        if (!canEditScript) {
                          return;
                        }
                        event.preventDefault();
                        if (draggedItemId && draggedItemId !== blockKey) {
                          setDropTargetId(blockKey);
                        }
                      }}
                      onDragLeave={() => {
                        if (dropTargetId === blockKey) {
                          setDropTargetId(null);
                        }
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        void handleDropItem(blockKey);
                      }}
                      onDragEnd={() => {
                        setDraggedItemId(null);
                        setDropTargetId(null);
                      }}
                    >
                      <Stack direction="row" spacing={3} align="stretch" w="full">
                        {section ? (
                          <Box
                            w={{ base: "6px", lg: "8px" }}
                            minW={{ base: "6px", lg: "8px" }}
                            rounded="full"
                            bg="gray.500"
                            boxShadow={isDropTarget ? "outline" : "none"}
                          />
                        ) : (
                          <Box
                            w="4px"
                            minW="4px"
                            rounded="full"
                            bg={color}
                            boxShadow={isDropTarget ? "outline" : "none"}
                          />
                        )}
                        <Stack
                          spacing={3}
                          flex="1 1 auto"
                          minW="0"
                          py={1}
                          px={isSelectedBlock || isMemoBlock ? 3 : 0}
                          bg={isSelectedBlock ? "teal.50" : isMemoBlock ? "gray.100" : "transparent"}
                          borderRadius="lg"
                          borderWidth={isSelectedBlock || isMemoBlock ? "1px" : "0"}
                          borderColor={isSelectedBlock ? "teal.200" : isMemoBlock ? "gray.300" : "transparent"}
                        >
                          {section ? (
                            <Box py={{ base: 2.5, lg: 3 }} borderBottomWidth="1px" borderColor="gray.200">
                              {isSectionEditing ? (
                                <Stack spacing={3}>
                                  <Textarea
                                    ref={editingSectionTextareaRef}
                                    value={editingSectionTitle}
                                    onChange={(event) => setEditingSectionTitle(event.target.value)}
                                    onKeyDown={(event) => handleSectionInputKeyDown(event, section)}
                                    minH="80px"
                                    overflow="hidden"
                                    resize="none"
                                    bg="white"
                                    autoFocus
                                  />
                                  <Stack direction="row" spacing={2}>
                                    <Button
                                      size="sm"
                                      colorScheme="teal"
                                      onClick={() => void handleSaveSectionEdit(section)}
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
                                <Text
                                  fontSize={{ base: "lg", lg: "xl" }}
                                  fontWeight="bold"
                                  letterSpacing="0.04em"
                                  color="gray.800"
                                  lineHeight="shorter"
                                >
                                  {section.title}
                                </Text>
                              )}
                            </Box>
                          ) : null}

                          {dialogue ? (
                            <Box>
                              <Box
                                as="button"
                                type="button"
                                fontSize="xs"
                                color="gray.500"
                                mb={1}
                                onClick={() => void handleCycleSpeaker(block)}
                                cursor={
                                  canEditScript &&
                                  !isSelectionMode &&
                                  block.speakerId !== MEMO_SPEAKER_ID &&
                                  speakers.length > 1
                                    ? "pointer"
                                    : "default"
                                }
                                textAlign="left"
                                _hover={
                                  canEditScript &&
                                  !isSelectionMode &&
                                  block.speakerId !== MEMO_SPEAKER_ID &&
                                  speakers.length > 1
                                    ? { color: "gray.700" }
                                    : undefined
                                }
                                disabled={
                                  !canEditScript ||
                                  isSelectionMode ||
                                  isChangingSpeaker ||
                                  isSavingEdit ||
                                  block.speakerId === MEMO_SPEAKER_ID
                                }
                              >
                                {name}
                              </Box>
                              {isEditing ? (
                                <Stack spacing={3}>
                                  <Textarea
                                    ref={editingDialogueTextareaRef}
                                    value={editingContent}
                                    onChange={(event) => setEditingContent(event.target.value)}
                                    onKeyDown={(event) => handleEditInputKeyDown(event, dialogue)}
                                    minH="120px"
                                    overflow="hidden"
                                    resize="none"
                                    bg="white"
                                    autoFocus
                                  />
                                  <Stack direction="row" spacing={2}>
                                    <Button
                                      size="sm"
                                      colorScheme="teal"
                                      onClick={() => void handleSaveEdit(dialogue)}
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
                                <Text whiteSpace="pre-wrap" color="gray.900" fontSize={contentFontSize} lineHeight="tall">
                                {dialogue.content}
                              </Text>
                              )}
                            </Box>
                          ) : null}

                          {block.mediaItems.length > 0 ? (
                            <Stack spacing={3}>
                              {block.mediaItems.map((media) => (
                                <Stack key={media.id} spacing={3}>
                                  {media.label ? (
                                    <Text fontSize={contentFontSize} color="gray.500">
                                      {media.label}
                                    </Text>
                                  ) : null}
                                  {media.mediaType === "image" || isImageUrl(media.url) ? (
                                    <Image
                                      src={media.url}
                                      alt={media.label || "media"}
                                      rounded="lg"
                                      w={{ base: "100%", md: "400px" }}
                                      maxW="400px"
                                      h="auto"
                                      objectFit="contain"
                                      bg="white"
                                    />
                                  ) : getYouTubeThumbnailUrl(media.url) ? (
                                    <AspectRatio ratio={16 / 9} maxW="420px">
                                      <Image
                                        src={getYouTubeThumbnailUrl(media.url) ?? ""}
                                        alt={media.label || "video thumbnail"}
                                        rounded="lg"
                                        objectFit="cover"
                                        bg="blackAlpha.100"
                                      />
                                    </AspectRatio>
                                  ) : isVideoUrl(media.url) ? (
                                    <AspectRatio ratio={16 / 9} maxW="420px">
                                      <Box
                                        as="video"
                                        src={media.url}
                                        rounded="lg"
                                        muted
                                        playsInline
                                        preload="metadata"
                                        bg="blackAlpha.100"
                                      />
                                    </AspectRatio>
                                  ) : (
                                    <Box bg="white" borderWidth="1px" rounded="lg" px={4} py={3}>
                                      <Text color="gray.700" fontSize="sm">
                                        URL
                                      </Text>
                                    </Box>
                                  )}
                                </Stack>
                              ))}
                            </Stack>
                          ) : null}
                        </Stack>
                      </Stack>
                    </Box>

                    <Tooltip label="削除" hasArrow>
                      <IconButton
                        aria-label="項目を削除"
                        icon={<MinusIcon />}
                        size="sm"
                        variant="ghost"
                        colorScheme="red"
                        rounded="full"
                        alignSelf="center"
                        onClick={() => void handleDeleteItem(block.itemIds[0])}
                        isLoading={!!deletingItemId && block.itemIds.includes(deletingItemId)}
                        isDisabled={isSelectionMode || (isEditing && isSavingEdit)}
                        display={canEditScript && !isSelectionMode ? "inline-flex" : "none"}
                        sx={{
                          "@media print": {
                            display: "none"
                          }
                        }}
                      />
                    </Tooltip>
                  </Stack>
                </Stack>
              );
            })}

            {items.length > 0 ? (
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
                  display={canEditScript && !isSelectionMode ? "inline-flex" : "none"}
                  sx={{
                    "@media print": {
                      display: "none"
                    }
                  }}
                />
              </Tooltip>
            ) : null}

            <Box
              position="fixed"
              bottom={{ base: 4, lg: 6 }}
              right={{ base: 4, lg: rightFloatingOffset }}
              zIndex={20}
              display={canEditScript ? "block" : "none"}
              sx={{
                "@media print": {
                  display: "none"
                }
              }}
            >
              <Stack spacing={3} align="flex-end">
                {isReferencesOpen ? (
                  <Box
                    w={{ base: "calc(100vw - 1rem)", lg: "320px" }}
                    bg="white"
                    borderWidth="1px"
                    rounded="xl"
                    boxShadow="lg"
                    p={4}
                    onTouchStart={(event) => handlePanelTouchStart(event, referencesTouchStartRef)}
                    onTouchEnd={(event) =>
                      handlePanelTouchEnd(event, referencesTouchStartRef, () => {
                        setIsReferencesOpen(false);
                        handleCancelReferenceEdit();
                      })
                    }
                  >
                    <Stack spacing={3}>
                      <Input
                        placeholder="参考文献名"
                        value={referenceTextInput}
                        onChange={(event) => setReferenceTextInput(event.target.value)}
                      />
                      <Input
                        placeholder="URL"
                        value={referenceUrlInput}
                        onChange={(event) => setReferenceUrlInput(event.target.value)}
                      />
                      {script.references.length > 0 ? (
                        <Box maxH="180px" overflowY="auto" borderWidth="1px" rounded="md" px={3} py={2}>
                          <Stack spacing={2}>
                            {script.references.map((reference) => (
                              <Stack
                                key={reference.id}
                                direction="row"
                                justify="space-between"
                                align="start"
                                spacing={3}
                              >
                                <Box flex="1 1 auto" minW="0">
                                  {reference.text ? (
                                    <Text fontSize="sm" color="gray.800">
                                      {reference.text}
                                    </Text>
                                  ) : null}
                                  {reference.url ? (
                                    <Link
                                      href={reference.url}
                                      color="teal.600"
                                      isExternal
                                      fontSize="sm"
                                      wordBreak="break-all"
                                    >
                                      {reference.url}
                                    </Link>
                                  ) : null}
                                </Box>
                                <Stack direction="row" spacing={1}>
                                  <Tooltip label="編集" hasArrow>
                                    <IconButton
                                      aria-label="参考文献を編集"
                                      size="xs"
                                      icon={<EditIcon />}
                                      variant="ghost"
                                      rounded="full"
                                      onClick={() => handleStartEditReference(reference)}
                                      isDisabled={isSavingReference}
                                    />
                                  </Tooltip>
                                  <Tooltip label="削除" hasArrow>
                                    <IconButton
                                      aria-label="参考文献を削除"
                                      size="xs"
                                      icon={<DeleteIcon />}
                                      variant="ghost"
                                      colorScheme="red"
                                      rounded="full"
                                      onClick={() => void handleDeleteReference(reference.id)}
                                      isDisabled={isSavingReference}
                                    />
                                  </Tooltip>
                                </Stack>
                              </Stack>
                            ))}
                          </Stack>
                        </Box>
                      ) : null}
                      <Stack direction="row" justify="flex-end">
                        {editingReferenceId ? (
                          <Button variant="ghost" onClick={handleCancelReferenceEdit} isDisabled={isSavingReference}>
                            キャンセル
                          </Button>
                        ) : null}
                        <Button
                          colorScheme="teal"
                          onClick={() => void handleAddReference()}
                          isLoading={isSavingReference}
                        >
                          {editingReferenceId ? "保存" : "登録"}
                        </Button>
                      </Stack>
                    </Stack>
                  </Box>
                ) : null}

                <Tooltip label={isReferencesOpen ? "参考文献登録を閉じる" : "参考文献登録を開く"} hasArrow>
                  <IconButton
                    aria-label={isReferencesOpen ? "参考文献登録を閉じる" : "参考文献登録を開く"}
                    icon={<ReferenceIcon />}
                    variant={isReferencesOpen ? "solid" : "ghost"}
                    colorScheme="teal"
                    rounded="full"
                    bg={isReferencesOpen ? "teal.500" : "whiteAlpha.900"}
                    color={isReferencesOpen ? "white" : undefined}
                    boxShadow="md"
                    _hover={{
                      bg: isReferencesOpen ? "teal.600" : "white"
                    }}
                    onClick={() =>
                      setIsReferencesOpen((current) => {
                        const next = !current;
                        if (!next) {
                          handleCancelReferenceEdit();
                        }
                        return next;
                      })
                    }
                  />
                </Tooltip>
              </Stack>
            </Box>
          </Stack>
        </Box>

        {isMemoOpen ? (
          <Box
            bg="white"
            borderLeftWidth={{ base: "0", lg: "1px" }}
            borderTopWidth={{ base: "1px", lg: "0" }}
            h={{ base: "100vh", lg: "100vh" }}
            overflowY="auto"
            p={{ base: 4, lg: 5 }}
            order={{ base: 3, lg: 3 }}
            position={{ base: "fixed", lg: "relative" }}
            top={{ base: 0, lg: "auto" }}
            right={{ base: 0, lg: "auto" }}
            bottom={{ base: 0, lg: "auto" }}
            left={{ base: 0, lg: "auto" }}
            zIndex={{ base: 30, lg: "auto" }}
            onTouchStart={(event) => handlePanelTouchStart(event, memoTouchStartRef)}
            onTouchEnd={(event) => handlePanelTouchEnd(event, memoTouchStartRef, () => setIsMemoOpen(false))}
            sx={{
              "@media print": {
                display: "none"
              }
            }}
          >
            <Stack spacing={4} h="100%">
              <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                メモ
              </Text>
              <Textarea
                value={memoContent}
                onChange={(event) => setMemoContent(event.target.value)}
                onKeyDown={handleMemoKeyDown}
                placeholder="参考情報を自由にメモできます"
                minH={{ base: "220px", lg: "calc(100vh - 120px)" }}
                h={{ base: "220px", lg: "calc(100vh - 120px)" }}
                resize="none"
                readOnly={!canEditScript}
              />
              {canEditScript ? (
                <Button
                  alignSelf="flex-start"
                  colorScheme="teal"
                  onClick={() => void handleSaveMemo()}
                  isLoading={isSavingMemo}
                  isDisabled={memoContent === (script?.memoContent ?? "")}
                >
                  保存
                </Button>
              ) : null}
            </Stack>
          </Box>
        ) : null}
      </Grid>
    </Box>
  );
};

export default ProjectScriptComposePage;
