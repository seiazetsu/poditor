export type MemoState = { draft: string; base: string; remote: string };

export const receiveMemo = (state: MemoState, remote: string): MemoState => {
  if (state.draft === state.base || state.draft === remote) {
    return { draft: remote, base: remote, remote };
  }
  return { ...state, remote };
};

export const completeMemoSave = (state: MemoState, saved: string, previousBase: string): MemoState => {
  const remote = state.remote === previousBase ? saved : state.remote;
  return receiveMemo({ ...state, base: saved, remote }, remote);
};

export const hasMemoConflict = (state: MemoState) =>
  state.remote !== state.base && state.draft !== state.remote;
