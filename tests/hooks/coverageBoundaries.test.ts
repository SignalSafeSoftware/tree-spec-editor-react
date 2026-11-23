import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    END_NODE_ID,
    GRAPH_SELECTION_KIND,
    type EditorTree,
} from '@signalsafe/tree-spec-editor-core';
import { TestRenderer, act } from '../reactTestRenderer';
import { useEditorHistory } from '../../src/hooks/useEditorHistory';
import { useEditorSelection } from '../../src/hooks/useEditorSelection';
import { useCanvasContextMenu } from '../../src/hooks/useCanvasContextMenu';
import { editorBtnToneClass } from '../../src/ui/editorClasses';

function tree(): EditorTree {
    return {
        start_node: 'n1',
        nodes: {
            n1: {
                id: 'n1',
                type: 'prompt',
                prompt: 'Choose',
                choices: [],
                position: { x: 0, y: 0 },
            },
        },
        transitions: [],
    };
}

async function mount<T>(hook: () => T) {
    let latest: T;
    function Harness() {
        latest = hook();
        return null;
    }
    let renderer: ReturnType<typeof TestRenderer.create>;
    await act(async () => {
        renderer = TestRenderer.create(React.createElement(Harness));
    });
    return {
        get current() {
            return latest!;
        },
        unmount() {
            act(() => renderer.unmount());
        },
    };
}

afterEach(() => vi.unstubAllGlobals());

describe('history boundary ownership', () => {
    it('rejects empty histories, END copies and unavailable duplicate sources without changing selection', async () => {
        const h = await mount(() => useEditorHistory(false));
        const selection = vi.fn();
        const focus = vi.fn();
        expect(
            h.current.copySelectedNode({ kind: GRAPH_SELECTION_KIND.NODE, id: END_NODE_ID }),
        ).toBe(false);
        expect(h.current.copySelectedNode({ kind: GRAPH_SELECTION_KIND.NODE, id: '' })).toBe(false);
        expect(h.current.undo()).toBe(false);
        expect(h.current.redo()).toBe(false);
        await act(async () => h.current.replaceTreeWithoutHistory(tree()));
        expect(h.current.undo()).toBe(false);
        expect(h.current.redo()).toBe(false);
        expect(h.current.pasteCopiedNode(selection, focus)).toBe(false);
        await act(async () => {
            expect(
                h.current.copySelectedNode({ kind: GRAPH_SELECTION_KIND.NODE, id: 'deleted' }),
            ).toBe(true);
        });
        expect(h.current.pasteCopiedNode(selection, focus)).toBe(false);
        expect(h.current.duplicateNodeById('deleted', selection, focus)).toBeUndefined();
        expect(selection).not.toHaveBeenCalled();
        expect(focus).not.toHaveBeenCalled();
        expect(h.current.tree).toEqual(tree());
        h.unmount();
    });

    it('retains copy state in a published graph while blocking every mutating history operation', async () => {
        const h = await mount(() => useEditorHistory(true));
        await act(async () => h.current.replaceTreeWithoutHistory(tree()));
        expect(h.current.undo()).toBe(false);
        expect(h.current.redo()).toBe(false);
        expect(h.current.pasteCopiedNode(vi.fn(), vi.fn())).toBe(false);
        expect(h.current.duplicateNodeById('n1', vi.fn(), vi.fn())).toBeUndefined();
        h.unmount();
    });
});

describe('selection and browser effect boundaries', () => {
    it('resolves missing node and edge sources to null, and scrolls only available choice controls', async () => {
        const scrollIntoView = vi.fn();
        const getElementById = vi
            .fn()
            .mockReturnValueOnce(null)
            .mockReturnValue({ scrollIntoView });
        vi.stubGlobal('document', { getElementById });
        const graph = tree();
        graph.transitions.push({
            id: 'orphan',
            fromNodeId: 'gone',
            fromChoiceId: 'c1',
            toNodeId: END_NODE_ID,
        });
        const h = await mount(() => useEditorSelection(graph));
        await act(async () =>
            h.current.applySelection({ kind: GRAPH_SELECTION_KIND.NODE, id: 'gone' }),
        );
        expect(h.current.selectedNode).toBeNull();
        await act(async () =>
            h.current.applySelection({ kind: GRAPH_SELECTION_KIND.EDGE, id: 'missing' }),
        );
        expect(h.current.selectedEdge).toBeNull();
        await act(async () =>
            h.current.applySelection({ kind: GRAPH_SELECTION_KIND.EDGE, id: 'orphan' }),
        );
        expect(h.current.inspectorNode).toBeNull();
        await act(async () => h.current.selectChoice('n1', 'c1'));
        await act(async () => h.current.selectChoice('n1', 'c2'));
        vi.stubGlobal('document', undefined);
        await act(async () => h.current.selectChoice('n1', 'c3'));
        expect(getElementById.mock.calls).toEqual([
            ['choice-editor-n1-c1'],
            ['choice-editor-n1-c2'],
        ]);
        expect(scrollIntoView).toHaveBeenCalledExactlyOnceWith({
            block: 'nearest',
            behavior: 'smooth',
        });
        h.unmount();
    });

    it('closes a context menu on outside pointer or Escape and removes all listeners', async () => {
        const listeners = new Map<string, EventListener>();
        const addEventListener = vi.fn((name: string, listener: EventListener) =>
            listeners.set(name, listener),
        );
        const removeEventListener = vi.fn((name: string) => listeners.delete(name));
        vi.stubGlobal('document', { addEventListener, removeEventListener });
        const h = await mount(() =>
            useCanvasContextMenu({ readOnly: false, onAutoLayout: vi.fn() }),
        );
        const event = { preventDefault: vi.fn(), clientX: 20, clientY: 30 };
        await act(async () => h.current.onPaneContextMenu(event as unknown as React.MouseEvent));
        expect(h.current.contextMenu).toEqual({ kind: 'pane', x: 20, y: 30 });
        act(() => listeners.get('keydown')!({ key: 'Enter' } as unknown as Event));
        expect(h.current.contextMenu).not.toBeNull();
        act(() => listeners.get('keydown')!({ key: 'Escape' } as unknown as Event));
        expect(h.current.contextMenu).toBeNull();
        expect(listeners.size).toBe(0);
        await act(async () => h.current.onPaneContextMenu(event as unknown as React.MouseEvent));
        act(() => listeners.get('pointerdown')!({} as Event));
        expect(h.current.contextMenu).toBeNull();
        h.unmount();
        expect(addEventListener).toHaveBeenCalledTimes(4);
        expect(removeEventListener).toHaveBeenCalledTimes(4);
    });

    it('does not consume context events on read-only canvases', async () => {
        const event = { preventDefault: vi.fn() };
        const h = await mount(() =>
            useCanvasContextMenu({ readOnly: true, onAutoLayout: vi.fn() }),
        );
        h.current.onNodeContextMenu(event as unknown as React.MouseEvent, {
            id: 'n1',
            position: { x: 0, y: 0 },
            data: {},
        });
        h.current.onPaneContextMenu(event as unknown as React.MouseEvent);
        expect(event.preventDefault).not.toHaveBeenCalled();
        expect(h.current.contextMenu).toBeNull();
        h.unmount();
    });
});

it('normalizes optional and outline button tones without changing custom tone names', () => {
    expect(editorBtnToneClass()).toBe('graph-editor-btn graph-editor-btn--neutral');
    expect(editorBtnToneClass('outline-custom')).toBe('graph-editor-btn graph-editor-btn--custom');
});

it('clears a focused choice when selecting a node-level issue', async () => {
    const h = await mount(() => useEditorSelection(tree()));
    await act(async () => h.current.selectChoice('n1', 'c1'));
    await act(async () => h.current.selectIssue({ node_id: 'n1' }));
    expect(h.current.focusChoiceId).toBeNull();
    expect(h.current.focusNodeId).toBe('n1');
    h.unmount();
});
