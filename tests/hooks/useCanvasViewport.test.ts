import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestRenderer, act } from '../reactTestRenderer';

import { END_NODE_ID, GRAPH_SELECTION_KIND } from '@signalsafe/tree-spec-editor-core';

import { useCanvasViewport, type UseCanvasViewportOptions } from '../../src/hooks/useCanvasViewport';

function Harness({
    options,
}: {
    options: UseCanvasViewportOptions;
}) {
    useCanvasViewport(options);
    return null;
}

function buildRf(overrides: Partial<UseCanvasViewportOptions['rf']> = {}) {
    return {
        getNode: vi.fn(() => ({ position: { x: 10, y: 20 } })),
        setCenter: vi.fn(),
        fitView: vi.fn(),
        screenToFlowPosition: vi.fn(),
        ...overrides,
    } as UseCanvasViewportOptions['rf'];
}

async function mountViewport(options: UseCanvasViewportOptions) {
    let root: ReturnType<typeof TestRenderer.create> | null = null;
    await act(async () => {
        root = TestRenderer.create(React.createElement(Harness, { options }));
    });
    return {
        rerender: async (next: UseCanvasViewportOptions) => {
            await act(async () => {
                root!.update(React.createElement(Harness, { options: next }));
            });
        },
        unmount: async () => {
            await act(async () => {
                root?.unmount();
            });
        },
    };
}

describe('useCanvasViewport', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('centers on focusNodeId and swallows setCenter errors', async () => {
        const suppressViewportSaveRef = { current: false };
        const rf = buildRf({
            setCenter: vi.fn(() => {
                throw new Error('setCenter failed');
            }),
        });

        const ctx = await mountViewport({
            rf,
            focusNodeId: 'start',
            suppressViewportSaveRef,
        });

        expect(rf.setCenter).toHaveBeenCalledWith(160, 80, { zoom: 1, duration: 300 });
        await act(async () => {
            vi.advanceTimersByTime(350);
        });
        expect(suppressViewportSaveRef.current).toBe(false);
        await ctx.unmount();
    });

    it('cleans up focus timers on unmount', async () => {
        const suppressViewportSaveRef = { current: false };
        const rf = buildRf();
        const ctx = await mountViewport({
            rf,
            focusNodeId: 'start',
            suppressViewportSaveRef,
        });

        expect(suppressViewportSaveRef.current).toBe(true);
        await ctx.unmount();
        await act(async () => {
            vi.advanceTimersByTime(350);
        });
        expect(suppressViewportSaveRef.current).toBe(true);
    });

    it('fits the view for fitViewNonce and swallows fitView errors', async () => {
        const suppressViewportSaveRef = { current: false };
        const rf = buildRf({
            fitView: vi.fn(() => {
                throw new Error('fitView failed');
            }),
        });

        const ctx = await mountViewport({
            rf,
            fitViewNonce: 1,
            suppressViewportSaveRef,
        });

        await act(async () => {
            vi.advanceTimersByTime(100);
        });
        expect(rf.fitView).toHaveBeenCalledWith({ padding: 0.2, duration: 300 });

        await act(async () => {
            vi.advanceTimersByTime(350);
        });
        expect(suppressViewportSaveRef.current).toBe(false);
        await ctx.unmount();
    });

    it('cleans up fitView timers on unmount before fitView runs', async () => {
        const suppressViewportSaveRef = { current: false };
        const rf = buildRf();
        const ctx = await mountViewport({
            rf,
            fitViewNonce: 1,
            suppressViewportSaveRef,
        });

        await ctx.unmount();
        await act(async () => {
            vi.advanceTimersByTime(200);
        });
        expect(rf.fitView).not.toHaveBeenCalled();
    });

    it('skips contextual zoom for edges, END nodes, and focused selections', async () => {
        const suppressViewportSaveRef = { current: false };
        const rf = buildRf();

        const edgeCtx = await mountViewport({
            rf,
            selected: { kind: GRAPH_SELECTION_KIND.EDGE, id: 't1' },
            suppressViewportSaveRef,
        });
        await act(async () => {
            vi.advanceTimersByTime(300);
        });
        expect(rf.fitView).not.toHaveBeenCalled();
        await edgeCtx.unmount();

        rf.fitView.mockClear();
        const endCtx = await mountViewport({
            rf,
            selected: { kind: GRAPH_SELECTION_KIND.NODE, id: END_NODE_ID },
            suppressViewportSaveRef,
        });
        await act(async () => {
            vi.advanceTimersByTime(300);
        });
        expect(rf.fitView).not.toHaveBeenCalled();
        await endCtx.unmount();

        rf.fitView.mockClear();
        const focusedCtx = await mountViewport({
            rf,
            focusNodeId: 'start',
            selected: { kind: GRAPH_SELECTION_KIND.NODE, id: 'start' },
            suppressViewportSaveRef,
        });
        await act(async () => {
            vi.advanceTimersByTime(300);
        });
        expect(rf.fitView).not.toHaveBeenCalled();
        await focusedCtx.unmount();
    });

    it('contextually fits selected nodes and swallows fitView errors', async () => {
        const suppressViewportSaveRef = { current: false };
        const rf = buildRf({
            fitView: vi.fn(() => {
                throw new Error('contextual fit failed');
            }),
        });

        const ctx = await mountViewport({
            rf,
            selected: { kind: GRAPH_SELECTION_KIND.NODE, id: 'review' },
            suppressViewportSaveRef,
        });

        await act(async () => {
            vi.advanceTimersByTime(0);
        });
        expect(rf.fitView).toHaveBeenCalledWith({
            nodes: [{ id: 'review' }],
            padding: 0.35,
            duration: 250,
            maxZoom: 1.25,
        });

        await act(async () => {
            vi.advanceTimersByTime(300);
        });
        expect(suppressViewportSaveRef.current).toBe(false);
        await ctx.unmount();
    });

    it('does not repeat contextual zoom for the same selection key', async () => {
        const suppressViewportSaveRef = { current: false };
        const rf = buildRf();
        const selected = { kind: GRAPH_SELECTION_KIND.NODE, id: 'review' } as const;

        const ctx = await mountViewport({
            rf,
            selected,
            suppressViewportSaveRef,
        });

        await act(async () => {
            vi.advanceTimersByTime(300);
        });
        expect(rf.fitView).toHaveBeenCalledTimes(1);

        await ctx.rerender({
            rf,
            selected: { ...selected },
            suppressViewportSaveRef,
        });
        await act(async () => {
            vi.advanceTimersByTime(300);
        });
        expect(rf.fitView).toHaveBeenCalledTimes(1);
        await ctx.unmount();
    });
});
