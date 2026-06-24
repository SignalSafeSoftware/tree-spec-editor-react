import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestRenderer, act } from '../reactTestRenderer';

import { GRAPH_SELECTION_KIND } from '@signalsafe/tree-spec-editor-core';

import { useChoiceDragDrop } from '../../src/hooks/useChoiceDragDrop';
import type { UseChoiceDragDropOptions, UseChoiceDragDropResult } from '../../src/hooks/useChoiceDragDrop';

type LatestRef = { current: UseChoiceDragDropResult | null };

function Harness({ options, latestRef }: { options: UseChoiceDragDropOptions; latestRef: LatestRef }) {
    latestRef.current = useChoiceDragDrop(options);
    return null;
}

async function mountHook(options: UseChoiceDragDropOptions) {
    const latest: LatestRef = { current: null };
    let root: ReturnType<typeof TestRenderer.create> | null = null;
    await act(async () => {
        root = TestRenderer.create(React.createElement(Harness, { options, latestRef: latest }));
    });
    return {
        latest,
        unmount: () => root?.unmount(),
    };
}

describe('useChoiceDragDrop', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('falls back to onSelect when onChoiceSelect is not provided', async () => {
        const onSelect = vi.fn();
        const { latest, unmount } = await mountHook({ readOnly: false, onSelect });

        await act(async () => {
            latest.current!.handleChoiceDragStart('start', 'c1');
        });

        expect(onSelect).toHaveBeenCalledWith({ kind: GRAPH_SELECTION_KIND.NODE, id: 'start' });
        expect(latest.current?.choiceDrag).toEqual({ sourceNodeId: 'start', choiceId: 'c1' });
        unmount();
    });

    it('prefers onChoiceSelect over onSelect when both are provided', async () => {
        const onSelect = vi.fn();
        const onChoiceSelect = vi.fn();
        const { latest, unmount } = await mountHook({ readOnly: false, onSelect, onChoiceSelect });

        await act(async () => {
            latest.current!.handleChoiceDragStart('start', 'c2');
        });

        expect(onChoiceSelect).toHaveBeenCalledWith('start', 'c2');
        expect(onSelect).not.toHaveBeenCalled();
        unmount();
    });

    it('clears drag and drop target state on drag end', async () => {
        const { latest, unmount } = await mountHook({ readOnly: false });

        await act(async () => {
            latest.current!.handleChoiceDragStart('start', 'c1');
            latest.current!.handleChoiceDragOver('start', 1);
        });
        expect(latest.current?.choiceDropTarget).toEqual({ nodeId: 'start', index: 1 });

        await act(async () => {
            latest.current!.handleChoiceDragEnd();
        });
        expect(latest.current?.choiceDrag).toBeNull();
        expect(latest.current?.choiceDropTarget).toBeNull();
        unmount();
    });

    it('skips drag and drop handlers when readOnly is true', async () => {
        const onRepositionChoice = vi.fn();
        const onSelect = vi.fn();
        const { latest, unmount } = await mountHook({
            readOnly: true,
            onSelect,
            onRepositionChoice,
        });

        await act(async () => {
            latest.current!.handleChoiceDragStart('start', 'c1');
            latest.current!.handleChoiceDrop('start', 0);
        });

        expect(onSelect).not.toHaveBeenCalled();
        expect(onRepositionChoice).not.toHaveBeenCalled();
        expect(latest.current?.choiceDrag).toBeNull();
        unmount();
    });
});
