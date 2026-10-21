import { useEffect, useRef, type MutableRefObject, type RefObject } from 'react';

import { compileTreeSpec } from '@signalsafe/tree-spec';

import { AUTOSAVE_STATUS, type AutosaveStatus, type EditorTree } from '@signalsafe/tree-spec-editor-core';

import type { UseTreeSpecEditorActions } from './types.js';

export type UseEditorAutosaveOptions = {
    enableAutosave: boolean;
    autosaveDebounceMs: number;
    entityId: string | undefined;
    tree: EditorTree | null;
    isPublished: boolean;
    saving: boolean;
    failedSaveKey?: string | null;
    publishing: boolean;
    autosaveStatus: AutosaveStatus;
    setAutosaveStatus: (status: AutosaveStatus) => void;
    lastSavedKeyRef: MutableRefObject<string>;
    saveDraftRef: RefObject<UseTreeSpecEditorActions['saveDraft']>;
};

export function useEditorAutosave(options: UseEditorAutosaveOptions): void {
    const {
        enableAutosave,
        autosaveDebounceMs,
        entityId,
        tree,
        isPublished,
        saving,
        failedSaveKey = null,
        publishing,
        autosaveStatus,
        setAutosaveStatus,
        lastSavedKeyRef,
        saveDraftRef,
    } = options;

    const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!enableAutosave) return;
        if (!entityId || !tree) return;
        if (isPublished) return;
        if (saving || publishing) return;

        const compiled = compileTreeSpec(tree);
        const key = JSON.stringify(compiled);
        // Preserve failure state; retry this payload explicitly, or autosave a new edit.
        if (key === failedSaveKey) return;
        if (key === lastSavedKeyRef.current) {
            if (autosaveStatus !== AUTOSAVE_STATUS.SAVED) setAutosaveStatus(AUTOSAVE_STATUS.IDLE);
            return;
        }
        setAutosaveStatus(AUTOSAVE_STATUS.DIRTY);
        autosaveTimerRef.current = globalThis.setTimeout(() => {
            void saveDraftRef.current?.();
        }, autosaveDebounceMs);
        return () => {
            if (autosaveTimerRef.current) {
                globalThis.clearTimeout(autosaveTimerRef.current);
                autosaveTimerRef.current = null;
            }
        };
        // NOTE: autosaveStatus is intentionally NOT in deps. The dirty/idle
        // bookkeeping above flips status, and re-running the effect on every
        // status change would reset the debounce timer.
    }, [tree, entityId, isPublished, saving, failedSaveKey, publishing, autosaveDebounceMs, enableAutosave]);
}
