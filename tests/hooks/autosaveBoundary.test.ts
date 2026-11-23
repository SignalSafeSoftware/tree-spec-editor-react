import React from 'react';
import { expect, it, vi } from 'vitest';
import { AUTOSAVE_STATUS, type EditorTree } from '@signalsafe/tree-spec-editor-core';
import { TestRenderer, act } from '../reactTestRenderer';
import { useEditorAutosave } from '../../src/hooks/useEditorAutosave';

it('safely expires a pending debounce when no save callback is currently available', async () => {
    vi.useFakeTimers();
    const tree: EditorTree = {
        start_node: 'n1',
        nodes: {
            n1: { id: 'n1', type: 'prompt', choices: [], prompt: '', position: { x: 0, y: 0 } },
        },
        transitions: [],
    };
    const setAutosaveStatus = vi.fn();
    function Harness() {
        useEditorAutosave({
            tree,
            enableAutosave: true,
            autosaveDebounceMs: 5,
            entityId: 'v1',
            isPublished: false,
            saving: false,
            publishing: false,
            autosaveStatus: AUTOSAVE_STATUS.IDLE,
            setAutosaveStatus,
            lastSavedKeyRef: { current: '' },
            saveDraftRef: { current: null },
        });
        return null;
    }
    let renderer: ReturnType<typeof TestRenderer.create>;
    try {
        act(() => {
            renderer = TestRenderer.create(React.createElement(Harness));
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(10);
        });
        expect(setAutosaveStatus).toHaveBeenCalledExactlyOnceWith(AUTOSAVE_STATUS.DIRTY);
        act(() => renderer.unmount());
    } finally {
        vi.useRealTimers();
    }
});
