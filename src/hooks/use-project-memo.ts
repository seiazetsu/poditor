import { useEffect, useRef, useState } from "react";
import { ProjectMemoConflictError, subscribeProjectMemo, updateProjectMemoContent } from "@/lib/firebase/projects";
import { completeMemoSave, hasMemoConflict, receiveMemo } from "@/lib/projects/memo-state";

export const useProjectMemo = (projectId: string, userUid: string | undefined, canEdit: boolean) => {
  const [state, setState] = useState({ draft: "", base: "", remote: "" });
  const [ready, setReady] = useState(false);
  const [connected, setConnected] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);
  const generation = useRef(0);

  useEffect(() => {
    const current = ++generation.current;
    setState({ draft: "", base: "", remote: "" });
    setReady(false);
    setConnected(false);
    setError(null);
    setSaving(false);
    savingRef.current = false;
    if (!userUid) return;
    const unsubscribe = subscribeProjectMemo(projectId, (content, fromCache) => {
      if (generation.current !== current) return;
      setState((previous) => receiveMemo(previous, content));
      setReady(true);
      setConnected(!fromCache);
    }, () => {
      if (generation.current !== current) return;
      setConnected(false);
      setError("メモの同期に失敗しました。入力内容を控えてからページを再読み込みしてください。");
    });
    return () => { generation.current = current + 1; unsubscribe(); };
  }, [projectId, userUid]);

  const conflict = hasMemoConflict(state);
  const dirty = state.draft !== state.base;
  const save = async () => {
    if (!canEdit || !ready || !connected || !dirty || conflict || savingRef.current) return;
    const current = generation.current;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      await updateProjectMemoContent(projectId, { memoContent: state.draft, expectedContent: state.base });
      if (generation.current === current) {
        setState((previous) => completeMemoSave(previous, state.draft, state.base));
      }
    } catch (cause) {
      if (generation.current !== current) return;
      if (cause instanceof ProjectMemoConflictError) {
        setState((previous) => receiveMemo(previous, cause.latestContent));
      } else {
        setError("メモの保存に失敗しました。入力内容は保持されています。再度保存してください。");
      }
    } finally {
      if (generation.current === current) {
        savingRef.current = false;
        setSaving(false);
      }
    }
  };

  return {
    ...state, ready, connected, saving, error, conflict, dirty, save,
    edit: (draft: string) => setState((previous) => ({ ...previous, draft })),
    useLatest: () => setState((previous) => ({ draft: previous.remote, base: previous.remote, remote: previous.remote })),
    keepDraft: () => setState((previous) => ({ ...previous, base: previous.remote }))
  };
};
