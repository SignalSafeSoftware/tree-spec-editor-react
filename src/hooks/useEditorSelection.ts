import { useCallback, useEffect, useMemo, useState } from 'react';

import {
    END_NODE_ID,
    GRAPH_SELECTION_KIND,
    resolveGraphSelectionFocus,
    type EditorNode,
    type EditorTransition,
    type EditorTree,
    type GraphSelection,
} from '@signalsafe/tree-spec-editor-core';

export type UseEditorSelectionResult = {
    selection: GraphSelection;
    focusNodeId: string | null;
    focusChoiceId: string | null;
    fitViewNonce: number;
    selectedNode: EditorNode | null;
    selectedEdge: EditorTransition | null;
    inspectorNode: EditorNode | null;
    selectChoice: (nodeId: string, choiceId: string) => void;
    applySelection: (next: GraphSelection) => void;
    setFocusNodeId: (id: string | null) => void;
    setFocusChoiceId: (id: string | null) => void;
    triggerResetView: () => void;
    selectIssue: (issue: { node_id?: string; choice_id?: string }) => void;
    setSelection: (next: GraphSelection) => void;
};

export function useEditorSelection(tree: EditorTree | null): UseEditorSelectionResult {
    const [selection, setSelection] = useState<GraphSelection>({ kind: null, id: null });
    const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
    const [focusChoiceId, setFocusChoiceId] = useState<string | null>(null);
    const [fitViewNonce, setFitViewNonce] = useState(0);

    const selectChoice = useCallback((nodeId: string, choiceId: string) => {
        setSelection({ kind: GRAPH_SELECTION_KIND.NODE, id: nodeId });
        setFocusChoiceId(choiceId);
        setFocusNodeId(nodeId);
    }, []);

    const applySelection = useCallback(
        (next: GraphSelection) => {
            setSelection(next);
            if (next.kind === GRAPH_SELECTION_KIND.EDGE && next.id && tree) {
                if (!tree.transitions.some((t) => t.id === next.id)) return;
            }
            const { focusNodeId: nextFocusNodeId, focusChoiceId: nextFocusChoiceId } =
                resolveGraphSelectionFocus(next, tree);
            setFocusNodeId(nextFocusNodeId);
            setFocusChoiceId(nextFocusChoiceId);
        },
        [tree],
    );

    const selectedNode = useMemo<EditorNode | null>(() => {
        if (!tree || selection.kind !== GRAPH_SELECTION_KIND.NODE || !selection.id) return null;
        if (selection.id === END_NODE_ID) return null;
        return tree.nodes[selection.id] ?? null;
    }, [tree, selection]);

    const selectedEdge = useMemo<EditorTransition | null>(() => {
        if (!tree || selection.kind !== GRAPH_SELECTION_KIND.EDGE || !selection.id) return null;
        return tree.transitions.find((t: EditorTransition) => t.id === selection.id) ?? null;
    }, [tree, selection]);

    const inspectorNode = useMemo<EditorNode | null>(() => {
        if (selectedNode) return selectedNode;
        if (selectedEdge) return tree?.nodes[selectedEdge.fromNodeId] ?? null;
        return null;
    }, [selectedNode, selectedEdge, tree]);

    const triggerResetView = useCallback(() => setFitViewNonce((n) => n + 1), []);

    const selectIssue = useCallback((issue: { node_id?: string; choice_id?: string }) => {
        if (!issue.node_id) return;
        setSelection({ kind: GRAPH_SELECTION_KIND.NODE, id: issue.node_id });
        setFocusNodeId(issue.node_id);
        setFocusChoiceId(issue.choice_id ?? null);
        setFitViewNonce((n) => n + 1);
    }, []);

    useEffect(() => {
        if (!inspectorNode || !focusChoiceId) return;
        if (typeof document === 'undefined') return;
        const el = document.getElementById(`choice-editor-${inspectorNode.id}-${focusChoiceId}`);
        el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, [inspectorNode, focusChoiceId]);

    return {
        selection,
        focusNodeId,
        focusChoiceId,
        fitViewNonce,
        selectedNode,
        selectedEdge,
        inspectorNode,
        selectChoice,
        applySelection,
        setFocusNodeId,
        setFocusChoiceId,
        triggerResetView,
        selectIssue,
        setSelection,
    };
}
