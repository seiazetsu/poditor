"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertIcon,
  AspectRatio,
  Box,
  Container,
  Heading,
  Icon,
  IconButton,
  Image,
  Spinner,
  Stack,
  Text,
  Tooltip
} from "@chakra-ui/react";
import { useParams } from "next/navigation";

import { fetchPublicScriptPreview } from "@/lib/firebase/scripts";
import { PublicScriptPreview, ScriptItem, ScriptMediaItem, ScriptSectionItem, ScriptSpeaker } from "@/types/script";

const MEMO_SPEAKER_ID = "__memo__";
const MEMO_SPEAKER: ScriptSpeaker = {
  id: MEMO_SPEAKER_ID,
  name: "メモ",
  color: "#A0AEC0",
  updatedAt: ""
};

const CopyIcon = () => (
  <Icon viewBox="0 0 24 24" boxSize={4}>
    <path
      d="M9 9h10v10H9zM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
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

const isImageUrl = (url: string): boolean => /\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i.test(url);

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

const getVideoEmbedUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host === "youtu.be") {
      const id = parsed.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (host.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (host.includes("vimeo.com")) {
      const id = parsed.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    return null;
  }

  return null;
};

const isDirectVideoFileUrl = (url: string): boolean => /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);

const isVideoUrl = (url: string): boolean => {
  return (
    isDirectVideoFileUrl(url) ||
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

type PreviewDisplayBlock = {
  key: string;
  section?: ScriptSectionItem;
  dialogue?: Extract<ScriptItem, { type: "dialogue" }>;
  media?: ScriptMediaItem;
  speakerId: string;
};

const buildDisplayBlocks = (items: ScriptItem[]): PreviewDisplayBlock[] => {
  const blocks: PreviewDisplayBlock[] = [];

  for (let index = 0; index < items.length; index += 1) {
    const currentItem = items[index];
    const nextItem = items[index + 1];

    if (
      currentItem.type === "dialogue" &&
      nextItem?.type === "media" &&
      ((currentItem.pairId && currentItem.pairId === nextItem.pairId) ||
        (!currentItem.pairId && !nextItem.pairId && currentItem.speakerId === nextItem.speakerId))
    ) {
      blocks.push({
        key: currentItem.pairId ?? `${currentItem.id}-${nextItem.id}`,
        dialogue: currentItem,
        media: nextItem,
        speakerId: currentItem.speakerId
      });
      index += 1;
      continue;
    }

    if (currentItem.type === "section") {
      blocks.push({
        key: currentItem.id,
        section: currentItem,
        speakerId: ""
      });
      continue;
    }

    blocks.push({
      key: currentItem.pairId ?? currentItem.id,
      dialogue: currentItem.type === "dialogue" ? currentItem : undefined,
      media: currentItem.type === "media" ? currentItem : undefined,
      speakerId: currentItem.speakerId
    });
  }

  return blocks;
};

const PublicScriptPreviewPage = () => {
  const params = useParams<{ token: string }>();
  const [preview, setPreview] = useState<PublicScriptPreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copyTooltipLabel, setCopyTooltipLabel] = useState("URLをコピー");
  const [fontScale, setFontScale] = useState(1);

  const loadPreview = useCallback(async () => {
    if (!params.token) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextPreview = await fetchPublicScriptPreview(params.token);
      if (!nextPreview) {
        setPreview(null);
        setErrorMessage("共有プレビューが見つからないか、無効になっています。");
        return;
      }

      setPreview(nextPreview);
    } catch {
      setPreview(null);
      setErrorMessage("共有プレビューの読み込みに失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }, [params.token]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const speakerMap = useMemo(() => {
    return (preview?.speakers ?? []).reduce<Record<string, ScriptSpeaker>>((acc, speaker) => {
      acc[speaker.id] = speaker;
      return acc;
    }, {});
  }, [preview?.speakers]);

  const blocks = useMemo(() => buildDisplayBlocks(preview?.items ?? []), [preview?.items]);
  const estimatedDuration = useMemo(
    () => formatEstimatedDuration(preview?.items ?? []),
    [preview?.items]
  );

  const handleCopyPreviewUrl = async () => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyTooltipLabel("コピーしました");
      window.setTimeout(() => setCopyTooltipLabel("URLをコピー"), 1600);
    } catch {
      setCopyTooltipLabel("コピーに失敗しました");
      window.setTimeout(() => setCopyTooltipLabel("URLをコピー"), 1600);
    }
  };

  const handlePrint = () => {
    if (typeof window === "undefined") {
      return;
    }
    window.print();
  };

  const handleDecreaseFont = () => {
    setFontScale((prev) => Math.max(0.8, Math.round((prev - 0.1) * 10) / 10));
  };

  const handleIncreaseFont = () => {
    setFontScale((prev) => Math.min(1.4, Math.round((prev + 0.1) * 10) / 10));
  };

  if (isLoading) {
    return (
      <Box bg="gray.50" minH="100vh">
        <Stack spacing={4} align="center" py={20}>
          <Spinner size="lg" />
          <Text color="gray.600">共有プレビューを読み込んでいます...</Text>
        </Stack>
      </Box>
    );
  }

  if (errorMessage || !preview) {
    return (
      <Box bg="gray.50" minH="100vh" py={12}>
        <Container maxW="4xl">
          <Alert status="error" rounded="md">
            <AlertIcon />
            {errorMessage ?? "共有プレビューを表示できません。"}
          </Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box bg="gray.50" minH="100vh" py={{ base: 8, lg: 12 }}>
      <Box position="fixed" top={{ base: 4, lg: 6 }} right={{ base: 4, lg: 6 }} zIndex={20}>
        <Stack
          spacing={1}
          bg="whiteAlpha.950"
          borderWidth="1px"
          borderColor="gray.100"
          rounded="full"
          p={1}
          boxShadow="lg"
        >
          <Tooltip label="印刷" hasArrow placement="left">
            <IconButton
              aria-label="印刷"
              icon={<PrintIcon />}
              variant="ghost"
              rounded="full"
              onClick={handlePrint}
            />
          </Tooltip>

          <Tooltip label="文字を小さくする" hasArrow placement="left">
            <IconButton
              aria-label="文字を小さくする"
              icon={<TextSmallerIcon />}
              variant="ghost"
              rounded="full"
              onClick={handleDecreaseFont}
              isDisabled={fontScale <= 0.8}
            />
          </Tooltip>

          <Tooltip label="文字を大きくする" hasArrow placement="left">
            <IconButton
              aria-label="文字を大きくする"
              icon={<TextLargerIcon />}
              variant="ghost"
              rounded="full"
              onClick={handleIncreaseFont}
              isDisabled={fontScale >= 1.4}
            />
          </Tooltip>

          <Tooltip label={copyTooltipLabel} hasArrow placement="left">
            <IconButton
              aria-label="共有プレビューURLをコピー"
              icon={<CopyIcon />}
              variant="ghost"
              rounded="full"
              onClick={() => void handleCopyPreviewUrl()}
            />
          </Tooltip>
        </Stack>
      </Box>

      <Container maxW="4xl">
        <Stack spacing={8}>
          <Stack spacing={2}>
            <Heading size="lg">{preview.title}</Heading>
            <Text color="gray.500" fontSize="sm">
              想定時間: {estimatedDuration}
            </Text>
            <Text color="gray.500" fontSize="xs">
              プレビュー更新日時: {new Intl.DateTimeFormat("ja-JP", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit"
              }).format(new Date(preview.previewUpdatedAt))}
            </Text>
          </Stack>

          <Stack spacing={5} align="stretch" style={{ fontSize: `${fontScale}rem` }}>
            {blocks.map((block) => {
              const speaker = block.speakerId === MEMO_SPEAKER_ID ? MEMO_SPEAKER : speakerMap[block.speakerId];
              const color = speaker?.color ?? "#CBD5E0";
              const name = speaker?.name ?? "話者未設定";
              const embeddedVideoUrl = block.media ? getVideoEmbedUrl(block.media.url) : null;

              return (
                <Stack key={block.key} direction="row" spacing={3} align="stretch">
                  {block.section ? (
                    <Box w={{ base: "6px", lg: "8px" }} minW={{ base: "6px", lg: "8px" }} rounded="full" bg="gray.500" />
                  ) : (
                    <Box w="4px" minW="4px" rounded="full" bg={color} />
                  )}

                  <Stack spacing={3} flex="1 1 auto" minW="0" py={1}>
                    {block.section ? (
                      <Box py={{ base: 2.5, lg: 3 }} borderBottomWidth="1px" borderColor="gray.200">
                        <Text
                          fontSize={{ base: "lg", lg: "xl" }}
                          fontWeight="bold"
                          letterSpacing="0.04em"
                          color="gray.800"
                          lineHeight="shorter"
                        >
                          {block.section.title}
                        </Text>
                      </Box>
                    ) : null}

                    {block.dialogue ? (
                      <Box>
                        <Text fontSize="xs" color="gray.500" mb={1}>
                          {name}
                        </Text>
                        <Text whiteSpace="pre-wrap" color="gray.900" lineHeight="tall">
                          {block.dialogue.content}
                        </Text>
                      </Box>
                    ) : null}

                    {block.media ? (
                      <Stack spacing={3}>
                        {block.media.mediaType === "image" || isImageUrl(block.media.url) ? (
                          <Image
                            src={block.media.url}
                            alt={block.media.label || "media"}
                            rounded="lg"
                            w={{ base: "100%", md: "400px" }}
                            maxW="400px"
                            h="auto"
                            objectFit="contain"
                            bg="white"
                          />
                        ) : embeddedVideoUrl ? (
                          <AspectRatio ratio={16 / 9} maxW="560px">
                            <Box
                              as="iframe"
                              src={embeddedVideoUrl}
                              title={block.media.label || "動画"}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              allowFullScreen
                              rounded="lg"
                              bg="blackAlpha.100"
                            />
                          </AspectRatio>
                        ) : isVideoUrl(block.media.url) && isDirectVideoFileUrl(block.media.url) ? (
                          <AspectRatio ratio={16 / 9} maxW="560px">
                            <Box
                              as="video"
                              src={block.media.url}
                              rounded="lg"
                              controls
                              playsInline
                              preload="metadata"
                              bg="blackAlpha.100"
                            />
                          </AspectRatio>
                        ) : getYouTubeThumbnailUrl(block.media.url) ? (
                          <AspectRatio ratio={16 / 9} maxW="560px">
                            <Image
                              src={getYouTubeThumbnailUrl(block.media.url) ?? ""}
                              alt={block.media.label || "video thumbnail"}
                              rounded="lg"
                              objectFit="cover"
                              bg="blackAlpha.100"
                            />
                          </AspectRatio>
                        ) : (
                          <Box bg="white" borderWidth="1px" rounded="lg" px={4} py={3}>
                            <Text color="gray.700" fontSize="sm">
                              メディア参照
                            </Text>
                          </Box>
                        )}
                      </Stack>
                    ) : null}
                  </Stack>
                </Stack>
              );
            })}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
};

export default PublicScriptPreviewPage;
