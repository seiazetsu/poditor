import { ScriptItem, ScriptSpeaker } from "@/types/script";

export const TEXT_MODE_MEMO_MARKER = "メモ";
export const MEMO_SPEAKER_ID = "__memo__";
const IMAGE_MARKER = "[画像]";
const URL_MARKER = "[URL]";

export type TextModeBlockInput =
  | {
      type: "dialogue";
      speakerId: string;
      content: string;
    }
  | {
      type: "section";
      title: string;
    }
  | {
      type: "media";
      mediaType: "image" | "video";
      url: string;
    };

export type ParseScriptTextResult = {
  blocks: TextModeBlockInput[];
  errors: string[];
};

const stripOuterBlankLines = (value: string): string => {
  return value.replace(/^\n+/, "").replace(/\n+$/, "");
};

const isValidUrl = (value: string): boolean => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const finalizeBlock = (
  marker: string,
  bodyLines: string[],
  speakers: ScriptSpeaker[],
  errors: string[],
  blocks: TextModeBlockInput[]
) => {
  const body = stripOuterBlankLines(bodyLines.join("\n"));
  if (!marker) {
    if (body.trim().length > 0) {
      errors.push("先頭のブロックは #話者名 から始めてください。");
    }
    return;
  }

  if (!body.trim()) {
    errors.push(`#${marker} の本文を入力してください。`);
    return;
  }

  if (marker === TEXT_MODE_MEMO_MARKER) {
    blocks.push({
      type: "dialogue",
      speakerId: MEMO_SPEAKER_ID,
      content: body
    });
    return;
  }

  const speaker = speakers.find((entry) => entry.name === marker);
  if (!speaker) {
    errors.push(`未登録の話者です: ${marker}`);
    return;
  }

  blocks.push({
    type: "dialogue",
    speakerId: speaker.id,
    content: body
  });
};

const finalizeMediaBlock = (
  marker: "image" | "video" | "",
  bodyLines: string[],
  errors: string[],
  blocks: TextModeBlockInput[]
) => {
  const body = stripOuterBlankLines(bodyLines.join("\n")).trim();
  if (!marker) {
    return;
  }

  if (!body) {
    errors.push(`${marker === "image" ? IMAGE_MARKER : URL_MARKER} のURLを入力してください。`);
    return;
  }

  if (!isValidUrl(body)) {
    errors.push(`${marker === "image" ? IMAGE_MARKER : URL_MARKER} のURL形式が不正です。`);
    return;
  }

  const previousBlock = blocks[blocks.length - 1];
  if (!previousBlock || previousBlock.type === "section") {
    errors.push(`${marker === "image" ? IMAGE_MARKER : URL_MARKER} は直前のセリフまたはメモに続けて指定してください。`);
    return;
  }

  blocks.push({
    type: "media",
    mediaType: marker,
    url: body
  });
};

export const parseScriptText = (
  value: string,
  speakers: ScriptSpeaker[]
): ParseScriptTextResult => {
  const normalized = value.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const errors: string[] = [];
  const blocks: TextModeBlockInput[] = [];
  let currentMarker = "";
  let currentMediaMarker: "image" | "video" | "" = "";
  let currentBodyLines: string[] = [];

  lines.forEach((line) => {
    if (line === IMAGE_MARKER || line === URL_MARKER) {
      finalizeBlock(currentMarker, currentBodyLines, speakers, errors, blocks);
      finalizeMediaBlock(currentMediaMarker, currentBodyLines, errors, blocks);
      currentMarker = "";
      currentMediaMarker = line === IMAGE_MARKER ? "image" : "video";
      currentBodyLines = [];
      return;
    }

    if (line.startsWith("##")) {
      finalizeBlock(currentMarker, currentBodyLines, speakers, errors, blocks);
      finalizeMediaBlock(currentMediaMarker, currentBodyLines, errors, blocks);
      currentMarker = "";
      currentMediaMarker = "";
      currentBodyLines = [];

      const title = line.slice(2).trim();
      if (!title) {
        errors.push("##セクション名 の形式で入力してください。");
        return;
      }

      blocks.push({
        type: "section",
        title
      });
      return;
    }

    if (line.startsWith("#")) {
      finalizeBlock(currentMarker, currentBodyLines, speakers, errors, blocks);
      finalizeMediaBlock(currentMediaMarker, currentBodyLines, errors, blocks);
      currentMarker = line.slice(1).trim();
      currentMediaMarker = "";
      currentBodyLines = [];
      return;
    }

    currentBodyLines.push(line);
  });

  finalizeBlock(currentMarker, currentBodyLines, speakers, errors, blocks);
  finalizeMediaBlock(currentMediaMarker, currentBodyLines, errors, blocks);

  return {
    blocks,
    errors
  };
};

export const formatItemsAsScriptText = (
  items: ScriptItem[],
  speakers: ScriptSpeaker[]
): { text: string; hasUnsupportedItems: boolean } => {
  const speakerMap = new Map(speakers.map((speaker) => [speaker.id, speaker.name]));
  let hasUnsupportedItems = false;

  const blocks = items.flatMap((item) => {
    if (item.type === "section") {
      return [`##${item.title}`];
    }

    if (item.type === "media") {
      return [item.mediaType === "image" ? `${IMAGE_MARKER}\n${item.url}` : `${URL_MARKER}\n${item.url}`];
    }

    const marker = item.speakerId === MEMO_SPEAKER_ID
      ? TEXT_MODE_MEMO_MARKER
      : speakerMap.get(item.speakerId);

    if (!marker) {
      hasUnsupportedItems = true;
      return [];
    }

    return [`#${marker}\n${item.content}`];
  });

  return {
    text: blocks.join("\n\n"),
    hasUnsupportedItems
  };
};
