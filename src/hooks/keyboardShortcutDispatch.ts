import {
    duplicateNode,
    getKeyboardShortcutAction,
    GRAPH_SELECTION_KIND,
    KEYBOARD_SHORTCUT_ACTION,
    type EditorTree,
    type GraphSelection,
    type KeyboardShortcutAction,
} from '@signalsafe/tree-spec-editor-core';

export type KeyboardShortcutEvent = Pick<KeyboardEvent, 'preventDefault'>;

export type EditorKeyboardShortcutHandlers = {
    tree: EditorTree | null;
    selection: GraphSelection;
    isPublished: boolean;
    onPreview?: () => void;
    undo: () => boolean;
    redo: () => boolean;
    copySelectedNode: () => boolean;
    pasteCopiedNode: () => boolean;
    deleteSelectedNode: () => boolean;
    saveDraft: () => void | Promise<void>;
    validate: () => void | Promise<void>;
    commitTree: (next: EditorTree) => void;
    setSelection: (sel: GraphSelection) => void;
    setFocusNodeId: (id: string | null) => void;
};

export type EditorKeyboardShortcutKeyEvent = Pick<
    KeyboardEvent,
    'ctrlKey' | 'metaKey' | 'shiftKey' | 'key'
>;

/** Map editor state + key event to a shortcut action (extracted for cognitive complexity). */
export function resolveEditorKeyboardShortcutAction(
    keyEvent: EditorKeyboardShortcutKeyEvent,
    state: {
        tree: EditorTree | null;
        selection: GraphSelection;
        canUndo: boolean;
        canRedo: boolean;
        hasCopiedNode: boolean;
        isPublished: boolean;
    },
): KeyboardShortcutAction | null {
    return getKeyboardShortcutAction({
        ctrlKey: keyEvent.ctrlKey,
        metaKey: keyEvent.metaKey,
        shiftKey: keyEvent.shiftKey,
        key: keyEvent.key,
        hasSelectedNode: Boolean(
            state.tree && state.selection.kind === GRAPH_SELECTION_KIND.NODE && state.selection.id,
        ),
        hasSelectedEdge: Boolean(
            state.tree && state.selection.kind === GRAPH_SELECTION_KIND.EDGE && state.selection.id,
        ),
        canUndo: state.canUndo && !state.isPublished,
        canRedo: state.canRedo && !state.isPublished,
        hasCopiedNode: state.hasCopiedNode && !state.isPublished,
    });
}

/** Apply a resolved keyboard shortcut action (pure dispatch — no listener wiring). */
function preventDefaultIfSucceeded(event: KeyboardShortcutEvent, succeeded: boolean): void {
    if (succeeded) event.preventDefault();
}

function dispatchDuplicateShortcut(
    event: KeyboardShortcutEvent,
    handlers: EditorKeyboardShortcutHandlers,
    tree: EditorTree | null,
    selectedNodeId: string | null,
): void {
    if (!tree || !selectedNodeId) return;
    event.preventDefault();
    const duplicated = duplicateNode(tree, selectedNodeId);
    if (!duplicated) return;
    handlers.commitTree(duplicated.nextTree);
    handlers.setSelection({ kind: GRAPH_SELECTION_KIND.NODE, id: duplicated.nextNodeId });
    handlers.setFocusNodeId(duplicated.nextNodeId);
}

function dispatchDeleteShortcut(
    event: KeyboardShortcutEvent,
    handlers: EditorKeyboardShortcutHandlers,
    tree: EditorTree | null,
    selectedNodeId: string | null,
    selectedEdgeId: string | null,
): void {
    if (tree && selectedEdgeId) {
        handlers.commitTree({
            ...tree,
            transitions: tree.transitions.filter((transition) => transition.id !== selectedEdgeId),
        });
        handlers.setSelection({ kind: null, id: null });
        event.preventDefault();
        return;
    }
    if (!tree || !selectedNodeId) return;
    preventDefaultIfSucceeded(event, handlers.deleteSelectedNode());
}

export function dispatchEditorKeyboardShortcut(
    action: KeyboardShortcutAction | null,
    event: KeyboardShortcutEvent,
    handlers: EditorKeyboardShortcutHandlers,
): void {
    if (!action) return;

    const selectedNodeId =
        handlers.selection.kind === GRAPH_SELECTION_KIND.NODE ? handlers.selection.id : null;
    const selectedEdgeId =
        handlers.selection.kind === GRAPH_SELECTION_KIND.EDGE ? handlers.selection.id : null;
    const { tree } = handlers;

    switch (action) {
        case KEYBOARD_SHORTCUT_ACTION.UNDO:
            preventDefaultIfSucceeded(event, handlers.undo());
            return;
        case KEYBOARD_SHORTCUT_ACTION.REDO:
            preventDefaultIfSucceeded(event, handlers.redo());
            return;
        case KEYBOARD_SHORTCUT_ACTION.COPY:
            preventDefaultIfSucceeded(event, handlers.copySelectedNode());
            return;
        case KEYBOARD_SHORTCUT_ACTION.PASTE:
            preventDefaultIfSucceeded(event, handlers.pasteCopiedNode());
            return;
        case KEYBOARD_SHORTCUT_ACTION.SAVE:
            event.preventDefault();
            void handlers.saveDraft();
            return;
        case KEYBOARD_SHORTCUT_ACTION.VALIDATE:
            event.preventDefault();
            void handlers.validate();
            return;
        case KEYBOARD_SHORTCUT_ACTION.PREVIEW:
            if (handlers.onPreview) {
                event.preventDefault();
                handlers.onPreview();
            }
            return;
        case KEYBOARD_SHORTCUT_ACTION.DUPLICATE:
            dispatchDuplicateShortcut(event, handlers, tree, selectedNodeId);
            return;
        case KEYBOARD_SHORTCUT_ACTION.DELETE:
            dispatchDeleteShortcut(event, handlers, tree, selectedNodeId, selectedEdgeId);
            return;
        default:
            return;
    }
}
