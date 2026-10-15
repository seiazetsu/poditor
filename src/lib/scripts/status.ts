import type { ScriptStatus } from "../../types/script";

export type ScriptTab = "ideas" | "scripts" | "archive";
export const SCRIPT_TABS: ScriptTab[] = ["ideas", "scripts", "archive"];
export const SCRIPT_TAB_LABELS: Record<ScriptTab, string> = { ideas: "案", scripts: "台本", archive: "アーカイブ" };
export const ACTIVE_SCRIPT_STATUSES: ScriptStatus[] = ["draft", "almost_completed", "completed", "recorded"];
export const SCRIPT_STATUS_LABELS: Record<ScriptStatus, string> = {
  idea: "案", draft: "下書き", almost_completed: "ほぼ完成", completed: "完成", recorded: "収録済", archived: "アーカイブ"
};
export const SCRIPT_STATUS_COLOR_SCHEMES: Record<ScriptStatus, string> = {
  idea: "yellow", draft: "gray", almost_completed: "blue", completed: "green", recorded: "purple", archived: "gray"
};
export const SCRIPT_STATUS_OPTIONS: ScriptStatus[] = ["idea", ...ACTIVE_SCRIPT_STATUSES, "archived"];
export const getScriptTab = (status: ScriptStatus): ScriptTab => status === "idea" ? "ideas" : status === "archived" ? "archive" : "scripts";
export const getTabStatuses = (tab: ScriptTab): ScriptStatus[] => tab === "ideas" ? ["idea"] : tab === "archive" ? ["archived"] : [...ACTIVE_SCRIPT_STATUSES];
export const toScriptStatus = (value: unknown): ScriptStatus => SCRIPT_STATUS_OPTIONS.includes(value as ScriptStatus) ? value as ScriptStatus : "draft";
export const getNextScriptStatus = (status: ScriptStatus): ScriptStatus => {
  const index = ACTIVE_SCRIPT_STATUSES.indexOf(status);
  return index < 0 ? status : ACTIVE_SCRIPT_STATUSES[(index + 1) % ACTIVE_SCRIPT_STATUSES.length];
};
