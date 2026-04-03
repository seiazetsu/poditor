"use client";

import { FormEvent, useMemo, useState } from "react";
import NextLink from "next/link";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Link,
  Stack,
  Text
} from "@chakra-ui/react";

import { mapFirebaseAuthError } from "@/lib/firebase/auth";

type EmailAuthFormProps = {
  mode: "login" | "signup";
  onSubmit: (email: string, password: string) => Promise<void>;
  loading: boolean;
};

export const EmailAuthForm = ({ mode, onSubmit, loading }: EmailAuthFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const labels = useMemo(() => {
    if (mode === "signup") {
      return {
        submit: "ユーザー登録",
        nextText: "すでにアカウントをお持ちですか？",
        nextHref: "/login",
        nextLabel: "ログインへ"
      };
    }

    return {
      submit: "ログイン",
      nextText: "アカウントをお持ちでないですか？",
      nextHref: "/signup",
      nextLabel: "ユーザー登録へ"
    };
  }, [mode]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email || !password) {
      setError("メールアドレスとパスワードを入力してください。");
      return;
    }

    setError(null);

    try {
      await onSubmit(email, password);
    } catch (submitError) {
      setError(mapFirebaseAuthError(submitError));
    }
  };

  return (
    <Box as="form" onSubmit={handleSubmit}>
      <Stack spacing={5}>
      {error ? (
        <Alert status="error" rounded="md">
          <AlertIcon />
          {error}
        </Alert>
      ) : null}

      <FormControl isRequired>
        <FormLabel>メールアドレス</FormLabel>
        <Input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@example.com"
          type="email"
        />
      </FormControl>

      <FormControl isRequired>
        <FormLabel>パスワード</FormLabel>
        <Input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="6文字以上"
          type="password"
          minLength={6}
        />
      </FormControl>

      <Button colorScheme="teal" type="submit" isLoading={loading}>
        {labels.submit}
      </Button>

      <Text fontSize="sm" color="gray.600">
        {labels.nextText}{" "}
        <Link as={NextLink} href={labels.nextHref} color="teal.600">
          {labels.nextLabel}
        </Link>
      </Text>
      </Stack>
    </Box>
  );
};
