"use client";

import { FormEvent, useState } from "react";
import NextLink from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  Stack
} from "@chakra-ui/react";

import { createProjectScript } from "@/lib/firebase/scripts";

const ProjectScriptNewPage = () => {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const projectId = params.projectId;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMessage("タイトルを入力してください。");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const scriptId = await createProjectScript(projectId, { title: trimmedTitle });
      router.replace(`/projects/${projectId}/scripts/${scriptId}`);
    } catch {
      setErrorMessage("台本の作成に失敗しました。時間をおいて再度お試しください。");
      setIsSubmitting(false);
    }
  };

  return (
    <Box bg="gray.50" minH="100vh" py={10}>
      <Container maxW="3xl">
        <Box as="form" onSubmit={handleSubmit}>
          <Stack spacing={5} bg="white" p={6} rounded="md" borderWidth="1px">
            <Heading size="md">新規台本作成</Heading>

            {errorMessage ? (
              <Alert status="error" rounded="md">
                <AlertIcon />
                {errorMessage}
              </Alert>
            ) : null}

            <FormControl isRequired>
              <FormLabel>タイトル</FormLabel>
              <Input
                placeholder="例: 第1回収録台本"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={120}
              />
            </FormControl>

            <Stack direction={{ base: "column", sm: "row" }}>
              <Button type="submit" colorScheme="teal" isLoading={isSubmitting} isDisabled={!title.trim()}>
                作成
              </Button>
              <Button as={NextLink} href={`/projects/${projectId}`} variant="outline">
                キャンセル
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
};

export default ProjectScriptNewPage;
