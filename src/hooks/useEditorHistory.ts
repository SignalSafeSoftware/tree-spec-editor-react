import { useCallback, useRef, useState } from 'react';

import {
    canRedoEditorHistory,
    canUndoEditorHistory,
    clearEditorHistory,
    createEditorHistoryStack,
    duplicateNode,
    editorTreesEqual,
    END_NODE_ID,
    GRAPH_SELECTION_KIND,
    popEditorRedo,
    popEditorUndo,
    pushEditorHistory,
    type EditorHistoryStack,
    type EditorTree,
    type GraphSelection,
} from '@signalsafe/tree-spec-editor-core';

export type UseEditorHistoryResult = {
    tree: EditorTree | null;
    canUndo: boolean;
    canRedo: boolean;
    hasCopiedNode: boolean;
    commitTree: (next: EditorTree | null) => void;
    replaceTreeWithoutHistory: (next: EditorTree | null) => void;
    undo: () => boolean;
    redo: () => boolean;
    copySelectedNode: (selection: GraphSelection) => boolean;
        pasteCopiedNode: (
        setSelection: (next: GraphSelection) => void,
        setFocusNodeId: (id: string | null) => void,
    ) => boolean;
    duplicateNodeById: (
        nodeId: string,
        setSelection: (next: GraphSelection) => void,
        setFocusNodeId: (id: string | null) => void,
    ) => string | undefined;
};

export function useEditorHistory(isPublished: boolean): UseEditorHistoryResult {
    const [tree, setTree] = useState<EditorTree | null>(null);
    const historyRef = useRef<EditorHistoryStack>(createEditorHistoryStack());
    const copiedNodeIdRef = useRef<string | null>(null);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [hasCopiedNode, setHasCopiedNode] = useState(false);

    const syncHistoryMeta = useCallback(() => {
        const stack = historyRef.current;
        setCanUndo(canUndoEditorHistory(stack));
        setCanRedo(canRedoEditorHistory(stack));
    }, []);

    const resetEditorHistory = useCallback(() => {
        clearEditorHistory(historyRef.current);
        copiedNodeIdRef.current = null;
        setHasCopiedNode(false);
        syncHistoryMeta();
    }, [syncHistoryMeta]);

    const commitTree = useCallback(
        (next: EditorTree | null) => {
            setTree((prev) => {
                if (prev && next && !editorTreesEqual(prev, next)) {
                    pushEditorHistory(historyRef.current, prev);
                }
                return next;
            });
            queueMicrotask(syncHistoryMeta);
        },
        [syncHistoryMeta],
    );

    const replaceTreeWithoutHistory = useCallback(
        (next: EditorTree | null) => {
            resetEditorHistory();
            setTree(next);
        },
        [resetEditorHistory],
    );

    const undo = useCallback(() => {
        if (!tree || isPublished) return false;
        const result = popEditorUndo(historyRef.current, tree);
        if (!result) return false;
        historyRef.current.future.unshift(result.currentSnapshot);
        setTree(result.nextTree);
        queueMicrotask(syncHistoryMeta);
        return true;
    }, [tree, isPublished, syncHistoryMeta]);

    const redo = useCallback(() => {
        if (!tree || isPublished) return false;
        const result = popEditorRedo(historyRef.current, tree);
        if (!result) return false;
        historyRef.current.past.push(result.currentSnapshot);
        setTree(result.nextTree);
        queueMicrotask(syncHistoryMeta);
        return true;
    }, [tree, isPublished, syncHistoryMeta]);

    const copySelectedNode = useCallback((selection: GraphSelection) => {
        if (selection.kind !== GRAPH_SELECTION_KIND.NODE || !selection.id) return false;
        if (selection.id === END_NODE_ID) return false;
        copiedNodeIdRef.current = selection.id;
        setHasCopiedNode(true);
        return true;
    }, []);

    const pasteCopiedNode = useCallback(
        (
            setSelection: (next: GraphSelection) => void,
            setFocusNodeId: (id: string | null) => void,
        ) => {
            if (!tree || isPublished) return false;
            const sourceId = copiedNodeIdRef.current;
            if (!sourceId) return false;
            const duplicated = duplicateNode(tree, sourceId);
            if (!duplicated) return false;
            commitTree(duplicated.nextTree);
            setSelection({ kind: GRAPH_SELECTION_KIND.NODE, id: duplicated.nextNodeId });
            setFocusNodeId(duplicated.nextNodeId);
            return true;
        },
        [tree, isPublished, commitTree],
    );

    const duplicateNodeById = useCallback(
        (
            nodeId: string,
            setSelection: (next: GraphSelection) => void,
            setFocusNodeId: (id: string | null) => void,
        ) => {
            if (!tree || isPublished) return undefined;
            const duplicated = duplicateNode(tree, nodeId);
            if (!duplicated) return undefined;
            commitTree(duplicated.nextTree);
            setSelection({ kind: GRAPH_SELECTION_KIND.NODE, id: duplicated.nextNodeId });
            setFocusNodeId(duplicated.nextNodeId);
            return duplicated.nextNodeId;
        },
        [tree, isPublished, commitTree],
    );

    return {
        tree,
        canUndo,
        canRedo,
        hasCopiedNode,
        commitTree,
        replaceTreeWithoutHistory,
        undo,
        redo,
        copySelectedNode,
        pasteCopiedNode,
        duplicateNodeById,
    };
}
