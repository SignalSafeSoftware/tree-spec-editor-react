import { TERMINAL_OUTCOME } from '@signalsafe/tree-spec';
import {
    END_NODE_ID,
    choiceIdFromHandle,
    resolveDefaultEdgeType,
    resolveEffectiveEdgeType,
    resolveEdgeStrokeColor,
    shouldShowEdgeLabel,
    type EditorTree,
    type EditorTransition,
} from '@signalsafe/tree-spec-editor-core';
import type { Edge } from 'reactflow';

import {
    CHOICE_HANDLE_PREFIX,
    TARGET_HANDLE_ID,
} from './constants.js';
import { buildEdgeMarker, buildEdgeStyle, resolveEdgePathStroke } from './edgeStyle.js';

export function edgeLabelForTransition(tree: EditorTree, t: EditorTransition): string {
    const node = tree.nodes[t.fromNodeId];
    const choice = node?.choices?.find((c) => c.id === t.fromChoiceId);
    const base = choice?.label || t.fromChoiceId;
    if (t.toNodeId === END_NODE_ID) {
        const oc = t.outcome ?? TERMINAL_OUTCOME.AT_RISK;
        return `${base}  →  END (${oc})`;
    }
    return base;
}

export function buildEdgesFromTransitions(tree: EditorTree): Edge[] {
    return tree.transitions.map((t) => {
        const node = tree.nodes[t.fromNodeId];
        const choice = node?.choices?.find((c) => c.id === t.fromChoiceId);
        const showLabel = choice ? shouldShowEdgeLabel(choice) : true;
        const strokeColor = choice ? resolveEdgeStrokeColor(choice) : undefined;
        const edgeType = choice
            ? resolveEffectiveEdgeType(choice, tree._meta)
            : resolveDefaultEdgeType(tree._meta);
        const style = buildEdgeStyle(strokeColor);
        const markerStroke = resolveEdgePathStroke(style);

        return {
            id: t.id,
            source: t.fromNodeId,
            target: t.toNodeId,
            sourceHandle: `${CHOICE_HANDLE_PREFIX}${t.fromChoiceId}`,
            targetHandle: TARGET_HANDLE_ID,
            reconnectable: 'target',
            type: edgeType,
            label: showLabel ? edgeLabelForTransition(tree, t) : undefined,
            labelShowBg: true,
            markerEnd: buildEdgeMarker(markerStroke),
            style,
        };
    });
}

export function buildTransitionsFromEdges(edges: Edge[], existing: EditorTransition[]): EditorTransition[] {
    const existingById = new Map(existing.map((t) => [t.id, t] as const));
    return edges
        .filter((e) => e.source && e.target && e.source !== END_NODE_ID)
        .map((e) => {
            const fromChoiceId = choiceIdFromHandle(e.sourceHandle);
            const prior = existingById.get(String(e.id));
            return {
                id: String(e.id),
                fromNodeId: String(e.source),
                fromChoiceId: fromChoiceId,
                toNodeId: String(e.target),
                outcome: String(e.target) === END_NODE_ID ? (prior?.outcome ?? TERMINAL_OUTCOME.AT_RISK) : undefined,
            } satisfies EditorTransition;
        })
        .filter((t) => t.fromChoiceId.length > 0);
}
