"use client";

import { DragEvent, KeyboardEvent, TouchEvent, useCallback, useEffect, useRef, useState } from "react";
import NextLink from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Alert,
  AlertIcon,
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Badge,
  Box,
  Button,
  Checkbox,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Icon,
  IconButton,
  Input,
  Select,
  Stack,
  Text,
  Textarea,
  Tooltip,
  Tabs,
  TabList,
  TabPanels,
  TabPanel,
  Tab,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast
} from "@chakra-ui/react";

import { useProjectMemo } from "@/hooks/use-project-memo";

import { useAuth } from "@/components/auth/auth-provider";
import {
  addProjectMember,
  fetchProjectByIdForUser,
  fetchProjectMembers,
  updateProjectMemberRole
} from "@/lib/firebase/projects";
import { canEditProjectContent, canManageProjectMembers } from "@/lib/permissions/project";
import { fetchProjectScriptItems } from "@/lib/firebase/items";
import { fetchProjectSpeakers } from "@/lib/firebase/speakers";
import {
  deleteProjectScript,
  duplicateProjectScript,
  fetchScriptsByProjectId,
  migrateProjectScriptStatuses,
  reorderProjectScripts,
  updateProjectScriptStatus,
  updateProjectScriptTitle
} from "@/lib/firebase/scripts";
import { formatItemsAsScriptText } from "@/lib/scripts/text-mode";
import { ProjectDetail, ProjectMember, ProjectMemberRole } from "@/types/project";
import { ACTIVE_SCRIPT_STATUSES, SCRIPT_STATUS_LABELS, SCRIPT_STATUS_COLOR_SCHEMES, SCRIPT_TABS, SCRIPT_TAB_LABELS, getScriptTab, getNextScriptStatus, type ScriptTab } from "@/lib/scripts/status";
import { ScriptStatus, ScriptSummary } from "@/types/script";

const SettingsIcon = () => (
  <Icon viewBox="0 0 24 24" boxSize={4}>
    <path
      d="M12 3v3M12 18v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M3 12h3M18 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
      stroke="currentColor"
      strokeWidth="1.8"
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

const DuplicateIcon = () => (
  <Icon viewBox="0 0 24 24" boxSize={4}>
    <path
      d="M9 9h10v10H9zM5 5h10v2M5 5v10h2"
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

const CancelIcon = () => (
  <Icon viewBox="0 0 24 24" boxSize={4}>
    <path
      d="M7 7l10 10M17 7 7 17"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Icon>
);

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

const DragHandleIcon = () => (
  <Icon viewBox="0 0 24 24" boxSize={4}>
    <path
      d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Icon>
);

const MemoIcon = () => (
  <Icon viewBox="0 0 24 24" boxSize={5}>
    <path
      d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm3 5h6M9 13h6M9 17h3"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Icon>
);

const CloseIcon = () => (
  <Icon viewBox="0 0 24 24" boxSize={4}>
    <path
      d="M7 7l10 10M17 7 7 17"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Icon>
);

const formatCreatedAt = (createdAt: string): string => {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(createdAt));
};

const SCRIPT_STATUS_FILTER_STORAGE_KEY = "poditor-project-script-status-filter";
const PROJECT_MEMO_OPEN_STORAGE_KEY = "poditor-project-memo-open";

const ConversationModeIcon = () => (
  <Icon viewBox="0 0 24 24" boxSize={3.5}>
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
  <Icon viewBox="0 0 24 24" boxSize={3.5}>
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

const ProjectDetailPage = () => {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<ScriptTab>("scripts");
  const loadRequestRef = useRef(0);
  const { user } = useAuth();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [scripts, setScripts] = useState<ScriptSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeletingScriptId, setIsDeletingScriptId] = useState<string | null>(null);
  const [isDuplicatingScriptId, setIsDuplicatingScriptId] = useState<string | null>(null);
  const [editingScriptId, setEditingScriptId] = useState<string | null>(null);
  const [editingTitleInput, setEditingTitleInput] = useState("");
  const [isSavingScriptTitleId, setIsSavingScriptTitleId] = useState<string | null>(null);
  const [isSavingScriptStatusId, setIsSavingScriptStatusId] = useState<string | null>(null);
  const [isExportingScriptId, setIsExportingScriptId] = useState<string | null>(null);
  const [selectedStatuses, setSelectedStatuses] = useState<ScriptStatus[]>(ACTIVE_SCRIPT_STATUSES);
  const [memberEmailInput, setMemberEmailInput] = useState("");
  const [memberRoleInput, setMemberRoleInput] = useState<ProjectMemberRole>("viewer");
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isUpdatingMemberRoleId, setIsUpdatingMemberRoleId] = useState<string | null>(null);
  const [isMemoOpen, setIsMemoOpen] = useState(false);
  const [draggedScriptId, setDraggedScriptId] = useState<string | null>(null);
  const [dropTargetScriptId, setDropTargetScriptId] = useState<string | null>(null);
  const [isReorderingScripts, setIsReorderingScripts] = useState(false);
  const singleClickTimeoutRef = useRef<number | null>(null);
  const memoTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const hasLoadedStatusFilterRef = useRef(false);

  const projectId = params.projectId;

  const loadProject = useCallback(async () => {
    if (!user || !projectId) {
      return;
    }

    const request = ++loadRequestRef.current;
    setIsLoading(true);
    setScripts([]);
    setErrorMessage(null);

    try {
      const projectData = await fetchProjectByIdForUser(projectId, user.uid);
      if (request !== loadRequestRef.current) return;
      if (!projectData) {
        setProject(null);
        setMembers([]);
        setScripts([]);
        setErrorMessage("対象のプロジェクトが見つからないか、アクセス権がありません。");
        return;
      }

      if (projectData.scriptStatusSchemaVersion !== 1 && canEditProjectContent(projectData.currentUserRole)) {
        await migrateProjectScriptStatuses(projectId);
        projectData.scriptStatusSchemaVersion = 1;
      }
      if (request !== loadRequestRef.current) return;

      const [nextMembers, nextScripts] = await Promise.all([
        fetchProjectMembers(projectId),
        fetchScriptsByProjectId(projectId, activeTab)
      ]);

      if (request !== loadRequestRef.current) return;
      setProject(projectData);
      setMembers(nextMembers);
      setScripts(nextScripts);
    } catch {
      if (request === loadRequestRef.current) setErrorMessage("プロジェクト詳細の取得に失敗しました。");
    } finally {
      if (request === loadRequestRef.current) setIsLoading(false);
    }
  }, [activeTab, projectId, user]);

  useEffect(() => {
    void loadProject();
    return () => { loadRequestRef.current += 1; };
  }, [loadProject]);

  useEffect(() => {
    return () => {
      if (singleClickTimeoutRef.current) {
        window.clearTimeout(singleClickTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !user?.uid || !projectId) {
      return;
    }

    hasLoadedStatusFilterRef.current = false;

    const savedValue = window.localStorage.getItem(`${SCRIPT_STATUS_FILTER_STORAGE_KEY}:${user.uid}:${projectId}`);
    if (!savedValue) {
      setSelectedStatuses(ACTIVE_SCRIPT_STATUSES);
      hasLoadedStatusFilterRef.current = true;
      return;
    }

    try {
      const parsed = JSON.parse(savedValue);
      if (!Array.isArray(parsed)) {
        setSelectedStatuses(ACTIVE_SCRIPT_STATUSES);
        hasLoadedStatusFilterRef.current = true;
        return;
      }

      const nextStatuses = ACTIVE_SCRIPT_STATUSES.filter((status) => parsed.includes(status));
      setSelectedStatuses(nextStatuses);
      hasLoadedStatusFilterRef.current = true;
    } catch {
      setSelectedStatuses(ACTIVE_SCRIPT_STATUSES);
      hasLoadedStatusFilterRef.current = true;
    }
  }, [projectId, user?.uid]);

  useEffect(() => {
    if (typeof window === "undefined" || !user?.uid || !projectId) {
      return;
    }

    if (!hasLoadedStatusFilterRef.current) {
      return;
    }

    window.localStorage.setItem(
      `${SCRIPT_STATUS_FILTER_STORAGE_KEY}:${user.uid}:${projectId}`,
      JSON.stringify(selectedStatuses)
    );
  }, [projectId, selectedStatuses, user?.uid]);

  useEffect(() => {
    if (typeof window === "undefined" || !user?.uid || !projectId) {
      return;
    }

    const savedIsOpen = window.localStorage.getItem(`${PROJECT_MEMO_OPEN_STORAGE_KEY}:${user.uid}:${projectId}`);
    setIsMemoOpen(savedIsOpen === "true");
  }, [projectId, user?.uid]);

  useEffect(() => {
    if (typeof window === "undefined" || !user?.uid || !projectId) {
      return;
    }

    window.localStorage.setItem(`${PROJECT_MEMO_OPEN_STORAGE_KEY}:${user.uid}:${projectId}`, String(isMemoOpen));
  }, [isMemoOpen, projectId, user?.uid]);

  const currentUserRole = project?.currentUserRole ?? "viewer";
  const canEditScripts = canEditProjectContent(currentUserRole);
  const canManageMembers = canManageProjectMembers(currentUserRole);
  const memo = useProjectMemo(projectId, user?.uid, canEditScripts);

  const handleMemoTouchStart = (event: TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    memoTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleMemoTouchEnd = (event: TouchEvent<HTMLElement>) => {
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
  };

  const handleDeleteScript = async (scriptId: string) => {
    if (!canEditScripts || isListBusy) {
      return;
    }

    if (!window.confirm("この台本を削除しますか？")) {
      return;
    }

    setIsDeletingScriptId(scriptId);
    setErrorMessage(null);

    try {
      await deleteProjectScript(projectId, scriptId);
      setScripts((prev) => prev.filter((script) => script.id !== scriptId));
    } catch {
      setErrorMessage("台本の削除に失敗しました。");
    } finally {
      setIsDeletingScriptId(null);
    }
  };

  const handleDuplicateScript = async (scriptId: string) => {
    if (!canEditScripts || isListBusy) {
      return;
    }

    setIsDuplicatingScriptId(scriptId);
    setErrorMessage(null);

    try {
      await duplicateProjectScript(projectId, scriptId);
      const nextScripts = await fetchScriptsByProjectId(projectId, activeTab);
      setScripts(nextScripts);
    } catch {
      setErrorMessage("台本の複製に失敗しました。");
    } finally {
      setIsDuplicatingScriptId(null);
    }
  };

  const handleStartEditingScriptTitle = (script: ScriptSummary) => {
    if (!canEditScripts || isListBusy) {
      return;
    }

    setEditingScriptId(script.id);
    setEditingTitleInput(script.title);
    setErrorMessage(null);
  };

  const handleCancelEditingScriptTitle = () => {
    setEditingScriptId(null);
    setEditingTitleInput("");
  };

  const handleScriptTitleClick = (scriptId: string) => {
    if (editingScriptId) {
      return;
    }

    if (singleClickTimeoutRef.current) {
      window.clearTimeout(singleClickTimeoutRef.current);
    }

    singleClickTimeoutRef.current = window.setTimeout(() => {
      router.push(`/projects/${projectId}/scripts/${scriptId}/compose`);
      singleClickTimeoutRef.current = null;
    }, 220);
  };

  const handleSaveScriptTitle = async (scriptId: string) => {
    if (!canEditScripts || isListBusy) {
      return;
    }

    const trimmedTitle = editingTitleInput.trim();
    if (!trimmedTitle) {
      setErrorMessage("タイトルを入力してください。");
      return;
    }

    setIsSavingScriptTitleId(scriptId);
    setErrorMessage(null);

    try {
      await updateProjectScriptTitle(projectId, scriptId, { title: trimmedTitle });
      setScripts((prev) =>
        prev.map((script) =>
          script.id === scriptId ? { ...script, title: trimmedTitle, updatedAt: new Date().toISOString() } : script
        )
      );
      handleCancelEditingScriptTitle();
    } catch {
      setErrorMessage("台本タイトルの更新に失敗しました。");
    } finally {
      setIsSavingScriptTitleId(null);
    }
  };

  const handleScriptTitleKeyDown = (event: KeyboardEvent<HTMLInputElement>, script: ScriptSummary) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (isSavingScriptTitleId !== script.id) {
        handleCancelEditingScriptTitle();
      }
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (
        isSavingScriptTitleId !== script.id &&
        editingTitleInput.trim() &&
        editingTitleInput.trim() !== script.title
      ) {
        void handleSaveScriptTitle(script.id);
      }
    }
  };

  const handleChangeScriptStatus = async (script: ScriptSummary, nextStatus: ScriptStatus) => {
    if (!canEditScripts || isListBusy) {
      return;
    }

    setIsSavingScriptStatusId(script.id);
    setErrorMessage(null);

    try {
      await updateProjectScriptStatus(projectId, script.id, { status: nextStatus });
      if (getScriptTab(nextStatus) !== activeTab) {
        setScripts((previous) => previous.filter((current) => current.id !== script.id));
        toast({ title: `「${script.title}」を${SCRIPT_TAB_LABELS[getScriptTab(nextStatus)]}タブに移動しました`, status: "success", duration: 5000, isClosable: true });
      } else {
        setScripts((previous) => previous.map((current) => current.id === script.id
          ? { ...current, status: nextStatus, updatedAt: new Date().toISOString() } : current));
      }
    } catch {
      setErrorMessage("台本ステータスの更新に失敗しました。");
    } finally {
      setIsSavingScriptStatusId(null);
    }
  };

  const handleExportScript = async (script: ScriptSummary) => {
    if (typeof window === "undefined") {
      return;
    }

    setIsExportingScriptId(script.id);
    setErrorMessage(null);

    try {
      const [items, speakers] = await Promise.all([
        fetchProjectScriptItems(projectId, script.id),
        fetchProjectSpeakers(projectId, script.id)
      ]);
      const { text } = formatItemsAsScriptText(items, speakers);
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeTitle = script.title.trim().length > 0 ? script.title.trim() : "script";

      link.href = url;
      link.download = `${safeTitle}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      setErrorMessage("台本テキストのダウンロードに失敗しました。");
    } finally {
      setIsExportingScriptId(null);
    }
  };

  const handleAddMember = async () => {
    if (!canManageMembers) {
      return;
    }

    const trimmedEmail = memberEmailInput.trim();

    if (!trimmedEmail) {
      setErrorMessage("参加者追加にはメールアドレスが必要です。");
      return;
    }

    setIsAddingMember(true);
    setErrorMessage(null);

    try {
      await addProjectMember(projectId, {
        email: trimmedEmail,
        role: memberRoleInput
      });
      setMemberEmailInput("");
      setMemberRoleInput("viewer");
      const nextMembers = await fetchProjectMembers(projectId);
      setMembers(nextMembers);
    } catch (error) {
      if (error instanceof Error && error.message) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("参加者の追加に失敗しました。");
      }
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleUpdateMemberRole = async (member: ProjectMember, role: ProjectMemberRole) => {
    if (!canManageMembers || member.role === "owner" || member.role === role) {
      return;
    }

    setIsUpdatingMemberRoleId(member.id);
    setErrorMessage(null);

    try {
      await updateProjectMemberRole(projectId, member.uid, role);
      setMembers((prev) => prev.map((current) => (current.id === member.id ? { ...current, role } : current)));
    } catch {
      setErrorMessage("参加者権限の更新に失敗しました。");
    } finally {
      setIsUpdatingMemberRoleId(null);
    }
  };

  const isListBusy = Boolean(isReorderingScripts || isSavingScriptStatusId || isSavingScriptTitleId || isDeletingScriptId || isDuplicatingScriptId);

  const isAllStatusesSelected = activeTab !== "scripts" || (
    selectedStatuses.length === ACTIVE_SCRIPT_STATUSES.length &&
    ACTIVE_SCRIPT_STATUSES.every((status) => selectedStatuses.includes(status)));

  const canReorderScripts =
    canEditScripts &&
    !isLoading &&
    isAllStatusesSelected &&
    !editingScriptId &&
    !isSavingScriptStatusId &&
    !isSavingScriptTitleId &&
    !isDeletingScriptId &&
    !isDuplicatingScriptId &&
    !isReorderingScripts;

  const handleScriptDragStart = (event: DragEvent<HTMLElement>, scriptId: string) => {
    if (!canReorderScripts) {
      return;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.dropEffect = "move";
    event.dataTransfer.setData("text/plain", scriptId);

    setDraggedScriptId(scriptId);
    setDropTargetScriptId(scriptId);
  };

  const handleScriptDragEnd = () => {
    setDraggedScriptId(null);
    setDropTargetScriptId(null);
  };

  const handleScriptDrop = async (targetScriptId: string) => {
    if (!draggedScriptId || draggedScriptId === targetScriptId || !canReorderScripts) {
      handleScriptDragEnd();
      return;
    }

    const sourceIndex = scripts.findIndex((script) => script.id === draggedScriptId);
    const targetIndex = scripts.findIndex((script) => script.id === targetScriptId);

    if (sourceIndex === -1 || targetIndex === -1) {
      handleScriptDragEnd();
      return;
    }

    const previousScripts = scripts;
    const reordered = [...scripts];
    const [movedScript] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, movedScript);

    setScripts(reordered);
    setIsReorderingScripts(true);
    handleScriptDragEnd();

    try {
      await reorderProjectScripts(
        projectId,
        activeTab,
        reordered.map((script) => script.id)
      );
    } catch {
      setScripts(previousScripts);
      setErrorMessage("台本一覧の並び替え保存に失敗しました。再読み込みしてからお試しください。");
    } finally {
      setIsReorderingScripts(false);
    }
  };

  const filteredScripts = isLoading ? [] : scripts.filter((script) => getScriptTab(script.status) === activeTab && (activeTab !== "scripts" || selectedStatuses.includes(script.status)));

  const handleToggleStatusFilter = (status: ScriptStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((currentStatus) => currentStatus !== status) : [...prev, status]
    );
  };

  return (
    <Box bg="gray.50" minH="100vh" py={10}>
      <Container maxW="5xl">
        <Stack spacing={6}>
          <Stack direction={{ base: "column", sm: "row" }} justify="space-between" align="start">
            <Stack spacing={1}>
              <Heading size="lg">{project?.name ?? "プロジェクト詳細"}</Heading>
            </Stack>
            <Stack direction={{ base: "column", sm: "row" }} spacing={3}>
              <Button as={NextLink} href="/projects" variant="outline">
                プロジェクト一覧へ戻る
              </Button>
            </Stack>
          </Stack>

          {errorMessage ? (
            <Alert status="error" rounded="md">
              <AlertIcon />
              {errorMessage}
            </Alert>
          ) : null}

          <Accordion allowToggle bg="white" rounded="md" borderWidth="1px" overflow="hidden">
            <AccordionItem border="0">
              <AccordionButton px={6} py={5}>
                <Box flex="1" textAlign="left">
                  <Heading size="md">設定</Heading>
                </Box>
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel px={6} pb={6}>
                <Stack spacing={4}>
                  <Heading size="sm">参加メンバー</Heading>
                  {isLoading ? (
                    <Text color="gray.600">メンバーを読み込んでいます...</Text>
                  ) : (
                    <Stack spacing={3}>
                      {members.map((member) => (
                        <Stack
                          key={member.id}
                          direction={{ base: "column", sm: "row" }}
                          justify="space-between"
                          align={{ base: "start", sm: "center" }}
                          spacing={3}
                          borderWidth="1px"
                          rounded="md"
                          p={3}
                        >
                          <Stack spacing={1}>
                            <Text fontWeight="medium">{member.email || "email未設定"}</Text>
                            <Text fontSize="sm" color="gray.600">
                              uid: {member.uid}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              追加日時: {formatCreatedAt(member.createdAt)}
                            </Text>
                          </Stack>
                          <Badge
                            px={3}
                            py={1}
                            borderRadius="full"
                            colorScheme={
                              member.role === "owner" ? "purple" : member.role === "member" ? "teal" : "gray"
                            }
                          >
                            {member.role}
                          </Badge>
                          {canManageMembers && member.role !== "owner" ? (
                            <FormControl maxW="200px">
                              <Select
                                size="sm"
                                value={member.role}
                                onChange={(event) =>
                                  void handleUpdateMemberRole(member, event.target.value as ProjectMemberRole)
                                }
                                isDisabled={isUpdatingMemberRoleId === member.id}
                              >
                                <option value="member">member（編集可）</option>
                                <option value="viewer">viewer（閲覧のみ）</option>
                              </Select>
                            </FormControl>
                          ) : null}
                        </Stack>
                      ))}
                    </Stack>
                  )}

                  {canManageMembers ? (
                    <Box borderWidth="1px" rounded="md" p={4}>
                      <Stack spacing={3}>
                        <Heading size="sm">参加者を追加</Heading>
                        <Text fontSize="sm" color="gray.600">
                          メールアドレスと権限を指定して参加者を追加します。
                        </Text>
                        <FormControl isRequired>
                          <FormLabel>メールアドレス</FormLabel>
                          <Input
                            type="email"
                            value={memberEmailInput}
                            onChange={(event) => setMemberEmailInput(event.target.value)}
                          />
                        </FormControl>
                        <FormControl isRequired maxW="240px">
                          <FormLabel>権限</FormLabel>
                          <Select
                            value={memberRoleInput}
                            onChange={(event) => setMemberRoleInput(event.target.value as ProjectMemberRole)}
                          >
                            <option value="viewer">viewer（閲覧のみ）</option>
                            <option value="member">member（編集可）</option>
                          </Select>
                        </FormControl>
                        <Button
                          alignSelf="flex-start"
                          colorScheme="teal"
                          variant="outline"
                          onClick={() => void handleAddMember()}
                          isLoading={isAddingMember}
                          isDisabled={!memberEmailInput.trim()}
                        >
                          参加者を追加
                        </Button>
                      </Stack>
                    </Box>
                  ) : null}
                </Stack>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>

          <Box bg="white" p={6} rounded="md" borderWidth="1px">
            <Stack spacing={4}>
              <Stack direction="row" justify="space-between" align="center">
                <Heading size="md">台本一覧</Heading>
                {canEditScripts ? (
                  <Tooltip label="新規台本作成" hasArrow>
                    <IconButton
                      as={NextLink}
                      href={`/projects/${projectId}/scripts/new${activeTab === "ideas" ? "?status=idea" : ""}`}
                      aria-label="新規台本作成"
                      icon={<AddIcon />}
                      size="sm"
                      colorScheme="teal"
                      variant="outline"
                      rounded="full"
                    />
                  </Tooltip>
                ) : null}
              </Stack>

              <Tabs index={SCRIPT_TABS.indexOf(activeTab)} onChange={(index) => {
                if (isListBusy || editingScriptId) return;
                loadRequestRef.current += 1;
                setIsLoading(true);
                setScripts([]);
                setDraggedScriptId(null);
                setDropTargetScriptId(null);
                setActiveTab(SCRIPT_TABS[index]);
              }} colorScheme="teal">
                <TabList aria-label="台本の分類">
                  {SCRIPT_TABS.map((tab) => <Tab key={tab} isDisabled={isListBusy || Boolean(editingScriptId)}>{SCRIPT_TAB_LABELS[tab]}</Tab>)}
                </TabList>
                <TabPanels>
                  {SCRIPT_TABS.map((tab) => (
                    <TabPanel key={tab} px={0} pb={0}>
                      {tab === activeTab ? <Stack spacing={4}>

              {activeTab === "scripts" ? <FormControl>
                <Stack direction={{ base: "column", sm: "row" }} spacing={{ base: 2, sm: 4 }}>
                  {ACTIVE_SCRIPT_STATUSES.map((status) => (
                    <Checkbox
                      key={status}
                      isChecked={selectedStatuses.includes(status)}
                      onChange={() => handleToggleStatusFilter(status)}
                      isDisabled={isListBusy}
                      colorScheme="teal"
                    >
                      {SCRIPT_STATUS_LABELS[status]}
                    </Checkbox>
                  ))}
                </Stack>
              </FormControl> : null}

              {!isAllStatusesSelected ? (
                <Text color="gray.500" fontSize="sm">
                  台本タブの並び替えは、4種類のステータスをすべて選択すると利用できます。
                </Text>
              ) : null}

              {!isLoading && project && project.scriptStatusSchemaVersion !== 1 ? (
                <Alert status="warning"><AlertIcon />古い台本を表示するための準備が必要です。編集権限のあるメンバーが一度このプロジェクトを開くと完了します。</Alert>
              ) : null}

              {isLoading ? <Text color="gray.600">台本を読み込んでいます...</Text> : null}

              {!isLoading && scripts.length === 0 ? (
                <Text color="gray.600">このタブにはまだ台本がありません。</Text>
              ) : null}

              {!isLoading && scripts.length > 0 && filteredScripts.length === 0 ? (
                <Text color="gray.600">
                  {selectedStatuses.length === 0 ? "ステータスを1つ以上選択してください。" : "該当するステータスの台本はありません。"}
                </Text>
              ) : null}

              {filteredScripts.map((script) => (
                <Box
                  key={script.id}
                  borderBottomWidth="1px"
                  borderColor="gray.100"
                  py={2}
                  bg={dropTargetScriptId === script.id && draggedScriptId !== script.id ? "teal.50" : "transparent"}
                  transition="background-color 0.15s ease"
                >
                  <Stack
                    spacing={{ base: 2, md: 0 }}
                    justify="space-between"
                    align={{ base: "stretch", md: "center" }}
                    direction={{ base: "column", md: "row" }}
                    minH={{ base: "auto", md: "36px" }}
                    onDragOver={(event) => {
                      if (!canReorderScripts || !draggedScriptId || draggedScriptId === script.id) {
                        return;
                      }
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      if (dropTargetScriptId !== script.id) {
                        setDropTargetScriptId(script.id);
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      void handleScriptDrop(script.id);
                    }}
                  >
                    {editingScriptId === script.id ? (
                      <Stack direction="row" spacing={2} align="center" flex="1 1 auto" minW="0">
                        <Input
                          value={editingTitleInput}
                          onChange={(event) => setEditingTitleInput(event.target.value)}
                          onKeyDown={(event) => handleScriptTitleKeyDown(event, script)}
                          size="sm"
                          autoFocus
                        />
                        <Tooltip label="保存" hasArrow>
                          <IconButton
                            aria-label="保存"
                            icon={<SaveIcon />}
                            size="sm"
                            variant="ghost"
                            colorScheme="teal"
                            onClick={() => void handleSaveScriptTitle(script.id)}
                            isLoading={isSavingScriptTitleId === script.id}
                            isDisabled={!editingTitleInput.trim() || editingTitleInput.trim() === script.title}
                            rounded="full"
                          />
                        </Tooltip>
                        <Tooltip label="キャンセル" hasArrow>
                          <IconButton
                            aria-label="キャンセル"
                            icon={<CancelIcon />}
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEditingScriptTitle}
                            isDisabled={isSavingScriptTitleId === script.id}
                            rounded="full"
                          />
                        </Tooltip>
                      </Stack>
                    ) : (
                      <Stack direction="row" spacing={2} align="center" flex="1 1 auto" minW="0">
                        <Box
                          color={canReorderScripts ? "gray.500" : "gray.300"}
                          cursor={canReorderScripts ? "grab" : "default"}
                          draggable={canReorderScripts}
                          onDragStart={(event) => handleScriptDragStart(event, script.id)}
                          onDragEnd={handleScriptDragEnd}
                          aria-label="並び替えハンドル"
                          display={canEditScripts ? "block" : "none"}
                        >
                          <DragHandleIcon />
                        </Box>
                        <Tooltip label={script.editorMode === "conversation" ? "会話モード" : "テキストモード"} hasArrow>
                          <Box color={script.editorMode === "conversation" ? "blue.500" : "orange.500"} flexShrink={0}>
                            {script.editorMode === "conversation" ? <ConversationModeIcon /> : <TextModeIcon />}
                          </Box>
                        </Tooltip>
                        <Text
                          fontWeight="medium"
                          noOfLines={1}
                          flex="1 1 auto"
                          cursor="pointer"
                          onClick={() => handleScriptTitleClick(script.id)}
                          onDoubleClick={() => {
                            if (!canEditScripts) {
                              return;
                            }
                            if (singleClickTimeoutRef.current) {
                              window.clearTimeout(singleClickTimeoutRef.current);
                              singleClickTimeoutRef.current = null;
                            }
                            handleStartEditingScriptTitle(script);
                          }}
                        >
                          {script.title}
                        </Text>
                      </Stack>
                    )}
                    <Stack
                      direction={{ base: "column", sm: "row" }}
                      spacing={{ base: 2, sm: 3 }}
                      align={{ base: "start", sm: "center" }}
                      justify="space-between"
                      flexShrink={0}
                    >
                      <Stack direction="row" spacing={2} align="center" flexWrap="wrap">
                        <Badge
                          as="button"
                          type="button"
                          colorScheme={SCRIPT_STATUS_COLOR_SCHEMES[script.status]}
                          bg={script.status === "archived" ? "black" : undefined}
                          color={script.status === "archived" ? "white" : undefined}
                          borderRadius="full"
                          px={2.5}
                          py={1}
                          flexShrink={0}
                          cursor={
                            !canEditScripts || isListBusy || activeTab !== "scripts" || editingScriptId === script.id
                              ? "default"
                              : "pointer"
                          }
                          opacity={isSavingScriptStatusId === script.id ? 0.6 : 1}
                          transition="opacity 0.2s ease"
                          onClick={() => {
                            if (!canEditScripts || isListBusy || activeTab !== "scripts" || editingScriptId === script.id) {
                              return;
                            }

                            void handleChangeScriptStatus(script, getNextScriptStatus(script.status));
                          }}
                        >
                          {SCRIPT_STATUS_LABELS[script.status]}
                        </Badge>
                        {canEditScripts ? (
                          <Menu>
                            <MenuButton as={Button} size="xs" variant="ghost" isDisabled={isListBusy || Boolean(editingScriptId)} aria-label={`${script.title}の移動`}>移動</MenuButton>
                            <MenuList>
                              {script.status === "idea" ? <MenuItem onClick={() => void handleChangeScriptStatus(script, "draft")}>下書きに進める</MenuItem> : <MenuItem onClick={() => void handleChangeScriptStatus(script, "idea")}>案に戻す</MenuItem>}
                              {script.status === "archived" ? <MenuItem onClick={() => void handleChangeScriptStatus(script, "recorded")}>収録済に戻す</MenuItem> : <MenuItem onClick={() => void handleChangeScriptStatus(script, "archived")}>アーカイブする</MenuItem>}
                            </MenuList>
                          </Menu>
                        ) : null}
                      </Stack>
                      <Stack direction="row" spacing={1} flexShrink={0}>
                        <Tooltip label="基本設定" hasArrow>
                          <IconButton
                            as={NextLink}
                            href={`/projects/${projectId}/scripts/${script.id}`}
                            aria-label="基本設定"
                            icon={<SettingsIcon />}
                            size="sm"
                            variant="ghost"
                            colorScheme="teal"
                            rounded="full"
                            display={canEditScripts ? "inline-flex" : "none"}
                          />
                        </Tooltip>
                        <Tooltip label="本文編集" hasArrow>
                          <IconButton
                            as={NextLink}
                            href={`/projects/${projectId}/scripts/${script.id}/compose`}
                            aria-label="本文編集"
                            icon={<ComposeIcon />}
                            size="sm"
                            variant="ghost"
                            colorScheme="blue"
                            rounded="full"
                          />
                        </Tooltip>
                        <Tooltip label="テキストをダウンロード" hasArrow>
                          <IconButton
                            aria-label="テキストをダウンロード"
                            icon={<ExportIcon />}
                            size="sm"
                            variant="ghost"
                            colorScheme="orange"
                            onClick={() => {
                              void handleExportScript(script);
                            }}
                            isLoading={isExportingScriptId === script.id}
                            isDisabled={editingScriptId === script.id}
                            rounded="full"
                          />
                        </Tooltip>
                        <Tooltip label="複製" hasArrow>
                          <IconButton
                            aria-label="複製"
                            icon={<DuplicateIcon />}
                            size="sm"
                            variant="ghost"
                            colorScheme="purple"
                            onClick={() => {
                              void handleDuplicateScript(script.id);
                            }}
                            isLoading={isDuplicatingScriptId === script.id}
                            isDisabled={isListBusy || Boolean(editingScriptId) || !canEditScripts}
                            rounded="full"
                            display={canEditScripts ? "inline-flex" : "none"}
                          />
                        </Tooltip>
                        <Tooltip label="削除" hasArrow>
                          <IconButton
                            aria-label="削除"
                            icon={<DeleteIcon />}
                            size="sm"
                            variant="ghost"
                            colorScheme="red"
                            onClick={() => {
                              void handleDeleteScript(script.id);
                            }}
                            isLoading={isDeletingScriptId === script.id}
                            isDisabled={
                              isListBusy ||
                              editingScriptId === script.id ||
                              project?.ownerUid !== user?.uid ||
                              !canEditScripts
                            }
                            rounded="full"
                            display={project?.ownerUid === user?.uid && canEditScripts ? "inline-flex" : "none"}
                          />
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </Stack>
                </Box>
              ))}
                      </Stack> : null}
                    </TabPanel>
                  ))}
                </TabPanels>
              </Tabs>
            </Stack>
          </Box>
        </Stack>
      </Container>
      <Tooltip label={isMemoOpen ? "メモを閉じる" : "メモを開く"} hasArrow placement="left">
        <IconButton
          aria-label={isMemoOpen ? "メモを閉じる" : "メモを開く"}
          icon={<MemoIcon />}
          position="fixed"
          top={{ base: 4, md: 6 }}
          right={{ base: 4, md: 6 }}
          zIndex={50}
          colorScheme="teal"
          variant={isMemoOpen ? "solid" : "outline"}
          bg={isMemoOpen ? "teal.500" : "white"}
          rounded="full"
          boxShadow="lg"
          onClick={() => setIsMemoOpen((prev) => !prev)}
        />
      </Tooltip>
      {isMemoOpen ? (
        <Box
          position="fixed"
          inset={0}
          zIndex={40}
          onClick={() => setIsMemoOpen(false)}
          sx={{
            "@media print": {
              display: "none"
            }
          }}
        >
          <Box
            role="dialog"
            aria-label="プロジェクトメモ"
            position="absolute"
            top={{ base: 16, md: 20 }}
            right={{ base: 4, md: 6 }}
            w={{ base: "calc(100vw - 32px)", md: "420px", lg: "max(320px, 33vw)" }}
            maxW="calc(100vw - 32px)"
            maxH={{ base: "calc(100vh - 88px)", md: "calc(100vh - 104px)" }}
            bg="white"
            borderWidth="1px"
            rounded="md"
            boxShadow="2xl"
            p={{ base: 4, lg: 6 }}
            overflowY="auto"
            onClick={(event) => event.stopPropagation()}
            onTouchStart={handleMemoTouchStart}
            onTouchEnd={handleMemoTouchEnd}
          >
            <Stack spacing={4}>
              <Stack direction="row" justify="space-between" align="center">
                <Heading size="md">メモ</Heading>
                <Tooltip label="閉じる" hasArrow>
                  <IconButton
                    aria-label="メモを閉じる"
                    icon={<CloseIcon />}
                    size="sm"
                    variant="ghost"
                    rounded="full"
                    onClick={() => setIsMemoOpen(false)}
                  />
                </Tooltip>
              </Stack>
              <Text fontSize="sm" color="gray.600" role="status" aria-live="polite">
                {!memo.ready ? "読み込み中" : memo.saving ? "保存中" : memo.error ? "同期・保存エラー" : !memo.connected ? "接続を確認中（最新の保存状態は未確認）" : memo.conflict ? "別の端末で更新されました" : memo.dirty ? "未保存" : "保存済み"}
              </Text>
              {memo.error ? <Alert status="error"><AlertIcon />{memo.error}</Alert> : null}
              {memo.conflict ? (
                <Stack spacing={2}>
                  <Alert status="warning"><AlertIcon />別の端末で更新されました。入力内容を保持しています。最新の内容と比較して選択してください。</Alert>
                  <Text fontSize="sm">最新の保存内容</Text>
                  <Box whiteSpace="pre-wrap" maxH="160px" overflowY="auto" borderWidth="1px" p={2}>{memo.remote || "（空のメモ）"}</Box>
                  <Button size="sm" onClick={memo.useLatest} isDisabled={memo.saving}>最新の内容に置き換える</Button>
                  {canEditScripts ? <Button size="sm" onClick={memo.keepDraft} isDisabled={memo.saving}>入力内容を残して編集を続ける</Button> : null}
                  <Text fontSize="xs">入力内容を残した場合は、必要な内容を統合してから保存してください。</Text>
                </Stack>
              ) : null}
              <Textarea
                value={memo.draft}
                onChange={(event) => memo.edit(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    void memo.save();
                  }
                }}
                placeholder="今後のテーマや参考URLをテキストで記録できます"
                minH={{ base: "55vh", lg: "calc(100vh - 220px)" }}
                h={{ base: "55vh", lg: "calc(100vh - 220px)" }}
                resize="none"
                readOnly={!canEditScripts || !memo.ready || memo.saving}
              />
              {canEditScripts ? (
                <Button
                  alignSelf="flex-start"
                  colorScheme="teal"
                  onClick={() => void memo.save()}
                  isLoading={memo.saving}
                  isDisabled={!memo.ready || !memo.connected || !memo.dirty || memo.conflict}
                >
                  保存
                </Button>
              ) : null}
            </Stack>
          </Box>
        </Box>
      ) : null}
    </Box>
  );
};

export default ProjectDetailPage;
