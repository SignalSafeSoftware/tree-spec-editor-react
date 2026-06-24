import { describe, expect, it, vi } from 'vitest';

import {
    END_NODE_ID,
    GRAPH_SELECTION_KIND,
    KEYBOARD_SHORTCUT_ACTION,
    type EditorTree,
} from '@signalsafe/tree-spec-editor-core';

import { dispatchEditorKeyboardShortcut, resolveEditorKeyboardShortcutAction } from '../../src/hooks/keyboardShortcutDispatch';

function baseTree(): EditorTree {
    return {
        start_node: 'n1',
        nodes: {
            n1: { id: 'n1', type: 'prompt', prompt: 'Hi', choices: [{ id: 'c1', label: 'Go' }] },
        },
        transitions: [{ id: 't1', fromNodeId: 'n1', fromChoiceId: 'c1', toNodeId: 'end', outcome: 'safe' }],
    };
}

describe('dispatchEditorKeyboardShortcut', () => {
    it('redoes when REDO action is dispatched', () => {
        const redo = vi.fn(() => true);
        const event = { preventDefault: vi.fn() };

        dispatchEditorKeyboardShortcut(KEYBOARD_SHORTCUT_ACTION.REDO, event, {
            tree: baseTree(),
            selection: { kind: GRAPH_SELECTION_KIND.NODE, id: 'n1' },
            isPublished: false,
            undo: vi.fn(() => false),
            redo,
            copySelectedNode: vi.fn(() => false),
            pasteCopiedNode: vi.fn(() => false),
            deleteSelectedNode: vi.fn(() => false),
            saveDraft: vi.fn(),
            validate: vi.fn(),
            commitTree: vi.fn(),
            setSelection: vi.fn(),
            setFocusNodeId: vi.fn(),
        });

        expect(redo).toHaveBeenCalled();
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('deletes a selected edge transition', () => {
        const commitTree = vi.fn();
        const setSelection = vi.fn();
        const event = { preventDefault: vi.fn() };
        const tree = baseTree();

        dispatchEditorKeyboardShortcut(KEYBOARD_SHORTCUT_ACTION.DELETE, event, {
            tree,
            selection: { kind: GRAPH_SELECTION_KIND.EDGE, id: 't1' },
            isPublished: false,
            undo: vi.fn(() => false),
            redo: vi.fn(() => false),
            copySelectedNode: vi.fn(() => false),
            pasteCopiedNode: vi.fn(() => false),
            deleteSelectedNode: vi.fn(() => false),
            saveDraft: vi.fn(),
            validate: vi.fn(),
            commitTree,
            setSelection,
            setFocusNodeId: vi.fn(),
        });

        expect(commitTree).toHaveBeenCalledWith({ ...tree, transitions: [] });
        expect(setSelection).toHaveBeenCalledWith({ kind: null, id: null });
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('duplicates the selected node when DUPLICATE action is dispatched', () => {
        const commitTree = vi.fn();
        const setSelection = vi.fn();
        const setFocusNodeId = vi.fn();
        const event = { preventDefault: vi.fn() };
        const tree = baseTree();

        dispatchEditorKeyboardShortcut(KEYBOARD_SHORTCUT_ACTION.DUPLICATE, event, {
            tree,
            selection: { kind: GRAPH_SELECTION_KIND.NODE, id: 'n1' },
            isPublished: false,
            undo: vi.fn(() => false),
            redo: vi.fn(() => false),
            copySelectedNode: vi.fn(() => false),
            pasteCopiedNode: vi.fn(() => false),
            deleteSelectedNode: vi.fn(() => false),
            saveDraft: vi.fn(),
            validate: vi.fn(),
            commitTree,
            setSelection,
            setFocusNodeId,
        });

        expect(commitTree).toHaveBeenCalled();
        expect(setSelection).toHaveBeenCalled();
        expect(setFocusNodeId).toHaveBeenCalled();
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('does not commit when duplicateNode returns null', () => {
        const commitTree = vi.fn();
        const setSelection = vi.fn();
        const setFocusNodeId = vi.fn();
        const event = { preventDefault: vi.fn() };

        dispatchEditorKeyboardShortcut(KEYBOARD_SHORTCUT_ACTION.DUPLICATE, event, {
            tree: baseTree(),
            selection: { kind: GRAPH_SELECTION_KIND.NODE, id: END_NODE_ID },
            isPublished: false,
            undo: vi.fn(() => false),
            redo: vi.fn(() => false),
            copySelectedNode: vi.fn(() => false),
            pasteCopiedNode: vi.fn(() => false),
            deleteSelectedNode: vi.fn(() => false),
            saveDraft: vi.fn(),
            validate: vi.fn(),
            commitTree,
            setSelection,
            setFocusNodeId,
        });

        expect(event.preventDefault).toHaveBeenCalled();
        expect(commitTree).not.toHaveBeenCalled();
        expect(setSelection).not.toHaveBeenCalled();
        expect(setFocusNodeId).not.toHaveBeenCalled();
    });

    it('deletes the selected node when DELETE is dispatched for a node selection', () => {
        const deleteSelectedNode = vi.fn(() => true);
        const commitTree = vi.fn();
        const event = { preventDefault: vi.fn() };

        dispatchEditorKeyboardShortcut(KEYBOARD_SHORTCUT_ACTION.DELETE, event, {
            tree: baseTree(),
            selection: { kind: GRAPH_SELECTION_KIND.NODE, id: 'n1' },
            isPublished: false,
            undo: vi.fn(() => false),
            redo: vi.fn(() => false),
            copySelectedNode: vi.fn(() => false),
            pasteCopiedNode: vi.fn(() => false),
            deleteSelectedNode,
            saveDraft: vi.fn(),
            validate: vi.fn(),
            commitTree,
            setSelection: vi.fn(),
            setFocusNodeId: vi.fn(),
        });

        expect(deleteSelectedNode).toHaveBeenCalled();
        expect(commitTree).not.toHaveBeenCalled();
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('ignores unknown shortcut actions', () => {
        const event = { preventDefault: vi.fn() };

        dispatchEditorKeyboardShortcut('unknown-action' as never, event, {
            tree: baseTree(),
            selection: { kind: GRAPH_SELECTION_KIND.NODE, id: 'n1' },
            isPublished: false,
            undo: vi.fn(() => false),
            redo: vi.fn(() => false),
            copySelectedNode: vi.fn(() => false),
            pasteCopiedNode: vi.fn(() => false),
            deleteSelectedNode: vi.fn(() => false),
            saveDraft: vi.fn(),
            validate: vi.fn(),
            commitTree: vi.fn(),
            setSelection: vi.fn(),
            setFocusNodeId: vi.fn(),
        });

        expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('resolves undo from editor keyboard state', () => {
        const action = resolveEditorKeyboardShortcutAction(
            { ctrlKey: true, metaKey: false, shiftKey: false, key: 'z' },
            {
                tree: baseTree(),
                selection: { kind: GRAPH_SELECTION_KIND.NODE, id: 'n1' },
                canUndo: true,
                canRedo: false,
                hasCopiedNode: false,
                isPublished: false,
            },
        );

        expect(action).toBe(KEYBOARD_SHORTCUT_ACTION.UNDO);
    });
});
