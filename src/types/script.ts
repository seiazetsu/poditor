export type ScriptStatus = "draft" | "completed" | "recorded";
export type ScriptEditorMode = "conversation" | "text";

export type ScriptSummary = {
  id: string;
  title: string;
  status: ScriptStatus;
  editorMode: ScriptEditorMode;
  sortOrder?: number;
  updatedAt: string;
};

export type ScriptReference = {
  id: string;
  text: string;
  url: string;
};

export type ScriptDetail = ScriptSummary & {
  createdAt: string;
  references: ScriptReference[];
  memoContent: string;
  previewEnabled?: boolean;
  previewToken?: string | null;
  previewUpdatedAt?: string | null;
};

export type ScriptSpeaker = {
  id: string;
  name: string;
  color: string;
  updatedAt: string;
};

export type ScriptDialogueItem = {
  id: string;
  type: "dialogue";
  order: number;
  speakerId: string;
  pairId?: string;
  content: string;
  updatedAt: string;
};

export type ScriptSectionItem = {
  id: string;
  type: "section";
  order: number;
  speakerId: string;
  title: string;
  updatedAt: string;
};

export type ScriptMediaType = "image" | "video";

export type ScriptMediaItem = {
  id: string;
  type: "media";
  order: number;
  speakerId: string;
  pairId?: string;
  mediaType: ScriptMediaType;
  label: string;
  url: string;
  note: string;
  updatedAt: string;
};

export type ScriptItem = ScriptDialogueItem | ScriptSectionItem | ScriptMediaItem;

export type PublicScriptPreview = {
  token: string;
  projectId: string;
  scriptId: string;
  title: string;
  updatedAt: string;
  previewUpdatedAt: string;
  speakers: ScriptSpeaker[];
  items: ScriptItem[];
};
