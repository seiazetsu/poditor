"use client";

import { DragEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
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
  Tooltip
} from "@chakra-ui/react";

import { useAuth } from "@/components/auth/auth-provider";
import {
  addProjectMember,
  fetchProjectByIdForUser,
  fetchProjectMembers,
  updateProjectMemberRole
} from "@/lib/firebase/projects";
import { canEditProjectContent, canManageProjectMembers } from "@/lib/permissions/project";
import {
  deleteProjectScript,
  duplicateProjectScript,
  fetchScriptsByProjectId,
  reorderProjectScripts,
  updateProjectScriptStatus,
  updateProjectScriptTitle
} from "@/lib/firebase/scripts";
import { ProjectDetail, ProjectMember, ProjectMemberRole } from "@/types/project";
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

const formatCreatedAt = (createdAt: string): string => {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(createdAt));
};

const SCRIPT_STATUS_LABELS: Record<ScriptStatus, string> = {
  draft: "下書き",
  completed: "完成",
  recorded: "収録済"
};

const SCRIPT_STATUS_COLOR_SCHEMES: Record<ScriptStatus, string> = {
  draft: "gray",
  completed: "green",
  recorded: "purple"
};

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

const getNextScriptStatus = (status: ScriptStatus): ScriptStatus => {
  if (status === "draft") {
    return "completed";
  }

  if (status === "completed") {
    return "recorded";
  }

  return "draft";
};

const ProjectDetailPage = () => {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
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
  const [statusFilter, setStatusFilter] = useState<"all" | ScriptStatus>("all");
  const [memberEmailInput, setMemberEmailInput] = useState("");
  const [memberRoleInput, setMemberRoleInput] = useState<ProjectMemberRole>("viewer");
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isUpdatingMemberRoleId, setIsUpdatingMemberRoleId] = useState<string | null>(null);
  const [draggedScriptId, setDraggedScriptId] = useState<string | null>(null);
  const [dropTargetScriptId, setDropTargetScriptId] = useState<string | null>(null);
  const [isReorderingScripts, setIsReorderingScripts] = useState(false);
  const singleClickTimeoutRef = useRef<number | null>(null);

  const projectId = params.projectId;

  const loadProject = useCallback(async () => {
    if (!user || !projectId) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const projectData = await fetchProjectByIdForUser(projectId, user.uid);
      if (!projectData) {
        setProject(null);
        setMembers([]);
        setScripts([]);
        setErrorMessage("対象のプロジェクトが見つからないか、アクセス権がありません。");
        return;
      }

      const [nextMembers, nextScripts] = await Promise.all([
        fetchProjectMembers(projectId),
        fetchScriptsByProjectId(projectId)
      ]);

      setProject(projectData);
      setMembers(nextMembers);
      setScripts(nextScripts);
    } catch {
      setErrorMessage("プロジェクト詳細の取得に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }, [projectId, user]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  useEffect(() => {
    return () => {
      if (singleClickTimeoutRef.current) {
        window.clearTimeout(singleClickTimeoutRef.current);
      }
    };
  }, []);

  const currentUserRole = project?.currentUserRole ?? "viewer";
  const canEditScripts = canEditProjectContent(currentUserRole);
  const canManageMembers = canManageProjectMembers(currentUserRole);

  const handleDeleteScript = async (scriptId: string) => {
    if (!canEditScripts) {
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
    if (!canEditScripts) {
      return;
    }

    setIsDuplicatingScriptId(scriptId);
    setErrorMessage(null);

    try {
      await duplicateProjectScript(projectId, scriptId);
      const nextScripts = await fetchScriptsByProjectId(projectId);
      setScripts(nextScripts);
    } catch {
      setErrorMessage("台本の複製に失敗しました。");
    } finally {
      setIsDuplicatingScriptId(null);
    }
  };

  const handleStartEditingScriptTitle = (script: ScriptSummary) => {
    if (!canEditScripts) {
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
    if (!canEditScripts) {
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

  const handleCycleScriptStatus = async (script: ScriptSummary) => {
    if (!canEditScripts) {
      return;
    }

    const nextStatus = getNextScriptStatus(script.status);

    setIsSavingScriptStatusId(script.id);
    setErrorMessage(null);

    try {
      await updateProjectScriptStatus(projectId, script.id, { status: nextStatus });
      setScripts((prev) =>
        prev.map((currentScript) =>
          currentScript.id === script.id
            ? { ...currentScript, status: nextStatus, updatedAt: new Date().toISOString() }
            : currentScript
        )
      );
    } catch {
      setErrorMessage("台本ステータスの更新に失敗しました。");
    } finally {
      setIsSavingScriptStatusId(null);
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

  const canReorderScripts =
    canEditScripts &&
    statusFilter === "all" &&
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
        reordered.map((script) => script.id)
      );
    } catch {
      setScripts(previousScripts);
      setErrorMessage("台本一覧の並び替え保存に失敗しました。");
    } finally {
      setIsReorderingScripts(false);
    }
  };

  const filteredScripts = scripts.filter((script) => statusFilter === "all" || script.status === statusFilter);

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
                      href={`/projects/${projectId}/scripts/new`}
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

              <FormControl maxW="220px">
                <Select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as "all" | ScriptStatus)}
                  size="sm"
                >
                  <option value="all">全て</option>
                  <option value="draft">下書き</option>
                  <option value="completed">完成</option>
                  <option value="recorded">収録済</option>
                </Select>
              </FormControl>

              {statusFilter !== "all" ? (
                <Text color="gray.500" fontSize="sm">
                  並び替えは「全て」表示時に利用できます。
                </Text>
              ) : null}

              {isLoading ? <Text color="gray.600">台本を読み込んでいます...</Text> : null}

              {!isLoading && scripts.length === 0 ? (
                <Text color="gray.600">このプロジェクトにはまだ台本がありません。</Text>
              ) : null}

              {!isLoading && scripts.length > 0 && filteredScripts.length === 0 ? (
                <Text color="gray.600">該当するステータスの台本はありません。</Text>
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
                          borderRadius="full"
                          px={2.5}
                          py={1}
                          flexShrink={0}
                          cursor={
                            !canEditScripts || isSavingScriptStatusId === script.id || editingScriptId === script.id
                              ? "default"
                              : "pointer"
                          }
                          opacity={isSavingScriptStatusId === script.id ? 0.6 : 1}
                          transition="opacity 0.2s ease"
                          onClick={() => {
                            if (!canEditScripts || isSavingScriptStatusId === script.id || editingScriptId === script.id) {
                              return;
                            }

                            void handleCycleScriptStatus(script);
                          }}
                        >
                          {SCRIPT_STATUS_LABELS[script.status]}
                        </Badge>
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
                            isDisabled={isDeletingScriptId === script.id || editingScriptId === script.id || !canEditScripts}
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
                              isDuplicatingScriptId === script.id ||
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
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
};

export default ProjectDetailPage;
