"use client";

import { Alert, AlertIcon } from "@chakra-ui/react";

export type SaveStatus = "idle" | "saving" | "success" | "error";

type SaveStatusNoticeProps = {
  status: SaveStatus;
  message: string | null;
};

export const SaveStatusNotice = ({ status, message }: SaveStatusNoticeProps) => {
  if (status === "idle" || !message) {
    return null;
  }

  const alertStatus = status === "saving" ? "info" : status;

  return (
    <Alert status={alertStatus} rounded="md">
      <AlertIcon />
      {message}
    </Alert>
  );
};
