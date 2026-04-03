"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
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
  Stack,
  Text
} from "@chakra-ui/react";

import { useAuth } from "@/components/auth/auth-provider";
import { createProject, deleteProject, fetchProjectsForUser } from "@/lib/firebase/projects";
import { ProjectSummary } from "@/types/project";

const formatUpdatedAt = (updatedAt: string): string => {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(updatedAt));
};

const ProjectsPage = () => {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [nameInput, setNameInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    if (!user) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextProjects = await fetchProjectsForUser(user.uid);
      setProjects(nextProjects);
    } catch {
      setErrorMessage("プロジェクト一覧の取得に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const handleLogout = async () => {
    await signOut();
    router.replace("/login");
  };

  const handleCreateProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      setErrorMessage("プロジェクト名を入力してください。");
      return;
    }
    if (!user) {
      setErrorMessage("ログイン状態を確認できません。再ログインしてください。");
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);

    try {
      const projectId = await createProject({
        name: trimmedName,
        ownerUid: user.uid,
        ownerEmail: user.email ?? ""
      });
      router.replace(`/projects/${projectId}`);
    } catch {
      setErrorMessage("プロジェクトの作成に失敗しました。");
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async (project: ProjectSummary) => {
    const confirmed = window.confirm(`「${project.name}」を削除しますか？`);
    if (!confirmed) {
      return;
    }

    setDeletingProjectId(project.id);
    setErrorMessage(null);

    try {
      await deleteProject(project.id);
      setProjects((currentProjects) => currentProjects.filter((item) => item.id !== project.id));
    } catch {
      setErrorMessage("プロジェクトの削除に失敗しました。");
    } finally {
      setDeletingProjectId(null);
    }
  };

  return (
    <Box bg="gray.50" minH="100vh" py={10}>
      <Container maxW="4xl">
        <Stack spacing={6}>
          <Stack direction={{ base: "column", sm: "row" }} justify="space-between" align="start">
            <Stack spacing={1}>
              <Heading size="lg">プロジェクト一覧</Heading>
              <Text color="gray.600" fontSize="sm">
                ログイン中: {user?.email}
              </Text>
            </Stack>
            <Button colorScheme="gray" onClick={() => void handleLogout()}>
              ログアウト
            </Button>
          </Stack>

          <Box as="form" onSubmit={handleCreateProject} bg="white" p={6} rounded="md" borderWidth="1px">
            <Stack spacing={4}>
              <Heading size="md">新規プロジェクト作成</Heading>
              {errorMessage ? (
                <Alert status="error" rounded="md">
                  <AlertIcon />
                  {errorMessage}
                </Alert>
              ) : null}
              <FormControl isRequired>
                <FormLabel>プロジェクト名</FormLabel>
                <Input
                  placeholder="例: 春の新番組"
                  value={nameInput}
                  onChange={(event) => setNameInput(event.target.value)}
                  maxLength={120}
                />
              </FormControl>
              <Button type="submit" colorScheme="teal" alignSelf="flex-start" isLoading={isCreating}>
                プロジェクトを作成
              </Button>
            </Stack>
          </Box>

          {isLoading ? (
            <Box bg="white" p={6} rounded="md" borderWidth="1px">
              <Text color="gray.600">プロジェクトを読み込んでいます...</Text>
            </Box>
          ) : null}

          {!isLoading && projects.length === 0 ? (
            <Box bg="white" p={6} rounded="md" borderWidth="1px">
              <Text fontWeight="medium">参加中のプロジェクトはまだありません。</Text>
              <Text color="gray.600" fontSize="sm" mt={2}>
                上のフォームから最初のプロジェクトを作成してください。
              </Text>
            </Box>
          ) : null}

          <Stack spacing={3}>
            {projects.map((project) => (
              <Box key={project.id} bg="white" p={5} rounded="md" borderWidth="1px">
                <Stack
                  direction={{ base: "column", sm: "row" }}
                  justify="space-between"
                  align={{ base: "start", sm: "center" }}
                  spacing={4}
                >
                  <Stack spacing={1}>
                    <Text fontWeight="bold">{project.name}</Text>
                    <Text fontSize="sm" color="gray.600">
                      更新日時: {formatUpdatedAt(project.updatedAt)}
                    </Text>
                  </Stack>
                  <Stack direction="row" spacing={3}>
                    <Button as={NextLink} href={`/projects/${project.id}`} colorScheme="teal" variant="outline">
                      開く
                    </Button>
                    <Button
                      colorScheme="red"
                      variant="ghost"
                      onClick={() => void handleDeleteProject(project)}
                      isLoading={deletingProjectId === project.id}
                    >
                      削除
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            ))}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
};

export default ProjectsPage;
