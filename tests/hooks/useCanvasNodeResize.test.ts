import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Node } from 'reactflow';
import { TestRenderer, act } from '../reactTestRenderer';

import { type EditorTree } from '@signalsafe/tree-spec-editor-core';

import { useCanvasNodeResize } from '../../src/hooks/useCanvasNodeResize';
import type { UseCanvasNodeResizeOptions, UseCanvasNodeResizeResult } from '../../src/hooks/useCanvasNodeResize';

type LatestRef = { current: UseCanvasNodeResizeResult | null };

function Harness({ options, latestRef }: { options: UseCanvasNodeResizeOptions; latestRef: LatestRef }) {
    latestRef.current = useCanvasNodeResize(options);
    return null;
}

function createTree(): EditorTree {
    return {
        start_node: 'start',
        nodes: {
            start: {
                id: 'start',
                type: 'prompt',
                prompt: 'Hello',
                choices: [],
                position: { x: 0, y: 0 },
            },
            locked: {
                id: 'locked',
                type: 'prompt',
                prompt: 'Locked',
                choices: [],
                position: { x: 100, y: 0 },
                render_hints: { editor: { locked: true } },
            },
        },
        transitions: [],
    };
}

async function mountHook(options: UseCanvasNodeResizeOptions) {
    const latest: LatestRef = { current: null };
    let root: ReturnType<typeof TestRenderer.create> | null = null;
    await act(async () => {
        root = TestRenderer.create(React.createElement(Harness, { options, latestRef: latest }));
    });
    return { latest, unmount: () => root?.unmount() };
}

describe('useCanvasNodeResize', () => {
    it('skips resize start when readOnly is true', async () => {
        const tree = createTree();
        const treeRef = { current: tree };
        const setNodes = vi.fn();
        const setResizeHeightByNodeId = vi.fn();
        const isResizingRef = { current: false };

        const { latest, unmount } = await mountHook({
            readOnly: true,
            treeRef,
            onChange: vi.fn(),
            setNodes,
            isResizingRef,
            resizeHeightByNodeId: {},
            setResizeHeightByNodeId,
        });

        await act(async () => {
            latest.current!.handleResizeNodeStart('start', 300, 150);
        });

        expect(setNodes).not.toHaveBeenCalled();
        expect(isResizingRef.current).toBe(false);
        unmount();
    });

    it('skips resize commit for locked nodes and read-only editors', async () => {
        const tree = createTree();
        const treeRef = { current: tree };
        const onChange = vi.fn();
        const setResizeHeightByNodeId = vi.fn((updater: (prev: Record<string, number>) => Record<string, number>) =>
            typeof updater === 'function' ? updater({ start: 150 }) : updater,
        );
        const isResizingRef = { current: true };

        const { latest, unmount } = await mountHook({
            readOnly: false,
            treeRef,
            onChange,
            setNodes: vi.fn(),
            isResizingRef,
            resizeHeightByNodeId: { start: 150 },
            setResizeHeightByNodeId,
        });

        await act(async () => {
            latest.current!.handleResizeNode('locked', 320, 160);
        });
        expect(onChange).not.toHaveBeenCalled();

        onChange.mockClear();
        const readOnlyCtx = await mountHook({
            readOnly: true,
            treeRef,
            onChange,
            setNodes: vi.fn(),
            isResizingRef,
            resizeHeightByNodeId: { start: 150 },
            setResizeHeightByNodeId,
        });
        await act(async () => {
            readOnlyCtx.latest.current!.handleResizeNode('start', 320, 160);
        });
        expect(onChange).not.toHaveBeenCalled();
        unmount();
        readOnlyCtx.unmount();
    });

    it('persists resized dimensions through onChange', async () => {
        const tree = createTree();
        const treeRef = { current: tree };
        const onChange = vi.fn();
        const setNodes = vi.fn((updater: Node[] | ((nodes: Node[]) => Node[])) => {
            if (typeof updater === 'function') {
                updater([]);
            }
        });
        const setResizeHeightByNodeId = vi.fn((updater: (prev: Record<string, number>) => Record<string, number>) =>
            typeof updater === 'function' ? updater({ start: 150 }) : updater,
        );
        const isResizingRef = { current: true };

        const { latest, unmount } = await mountHook({
            readOnly: false,
            treeRef,
            onChange,
            setNodes,
            isResizingRef,
            resizeHeightByNodeId: { start: 150 },
            setResizeHeightByNodeId,
        });

        await act(async () => {
            latest.current!.handleResizeNodeStart('start', 300, 150);
            latest.current!.handleResizeNode('start', 320, 160);
        });

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][0].nodes.start.render_hints?.editor?.width).toBe(320);
        expect(onChange.mock.calls[0][0].nodes.start.render_hints?.editor?.height).toBe(160);
        expect(isResizingRef.current).toBe(false);
        unmount();
    });
});
