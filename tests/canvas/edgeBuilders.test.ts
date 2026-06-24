import { describe, expect, it } from 'vitest';

import {
    END_NODE_ID,
    patchChoiceEdgeHints,
    type EditorTree,
} from '@signalsafe/tree-spec-editor-core';

import { buildEdgesFromTransitions, buildTransitionsFromEdges, edgeLabelForTransition } from '../../src/canvas/edgeBuilders';
import { CHOICE_HANDLE_PREFIX, TARGET_HANDLE_ID } from '../../src/canvas/constants';

function createTree(): EditorTree {
    return {
        start_node: 'start',
        nodes: {
            start: {
                id: 'start',
                type: 'prompt',
                prompt: 'Hello',
                choices: [
                    { id: 'c1', label: 'Go' },
                    { id: 'c2', label: 'Stop' },
                ],
                position: { x: 0, y: 0 },
            },
            review: {
                id: 'review',
                type: 'info',
                prompt: '',
                choices: [],
                position: { x: 200, y: 50 },
            },
        },
        transitions: [
            { id: 't1', fromNodeId: 'start', fromChoiceId: 'c1', toNodeId: 'review' },
            { id: 't2', fromNodeId: 'start', fromChoiceId: 'c2', toNodeId: END_NODE_ID, outcome: 'safe' },
        ],
    };
}

describe('edgeBuilders', () => {
    it('edgeLabelForTransition formats END transitions with outcome', () => {
        const tree = createTree();
        const transition = tree.transitions[1];
        expect(edgeLabelForTransition(tree, transition)).toBe('Stop  →  END (safe)');
    });

    it('edgeLabelForTransition uses choice id when label is missing', () => {
        const tree = createTree();
        tree.nodes.start.choices = [{ id: 'c1', label: '' }];
        const transition = { ...tree.transitions[0], fromChoiceId: 'c1' };
        expect(edgeLabelForTransition(tree, transition)).toBe('c1');
    });

    it('buildEdgesFromTransitions maps transitions to React Flow edges', () => {
        const tree = createTree();
        const edges = buildEdgesFromTransitions(tree);
        expect(edges).toHaveLength(2);
        expect(edges[0]).toMatchObject({
            id: 't1',
            source: 'start',
            target: 'review',
            sourceHandle: `${CHOICE_HANDLE_PREFIX}c1`,
            targetHandle: TARGET_HANDLE_ID,
            reconnectable: 'target',
        });
        expect(edges[1].label).toContain('END');
    });

    it('buildTransitionsFromEdges round-trips editor transitions', () => {
        const tree = createTree();
        const edges = buildEdgesFromTransitions(tree);
        const transitions = buildTransitionsFromEdges(edges, tree.transitions);
        expect(transitions).toHaveLength(2);
        expect(transitions[0]).toMatchObject({
            fromNodeId: 'start',
            fromChoiceId: 'c1',
            toNodeId: 'review',
        });
        expect(transitions[1]).toMatchObject({
            fromNodeId: 'start',
            fromChoiceId: 'c2',
            toNodeId: END_NODE_ID,
            outcome: 'safe',
        });
    });

    it('buildTransitionsFromEdges filters edges without valid choice handles', () => {
        const tree = createTree();
        const edges = [
            {
                id: 'bad',
                source: 'start',
                target: 'review',
                sourceHandle: null,
            },
        ];
        expect(buildTransitionsFromEdges(edges, tree.transitions)).toHaveLength(0);
    });

    it('buildEdgesFromTransitions omits labels when showLabel is false', () => {
        const tree = createTree();
        tree.nodes.start.choices = [
            patchChoiceEdgeHints(tree.nodes.start.choices![0], { showLabel: false }),
            tree.nodes.start.choices![1],
        ];
        const edges = buildEdgesFromTransitions(tree);
        expect(edges[0].label).toBeUndefined();
        expect(edges[1].label).toContain('END');
    });

    it('buildEdgesFromTransitions handles transitions whose source node is missing', () => {
        const tree = createTree();
        tree.transitions = [
            {
                id: 'orphan',
                fromNodeId: 'missing-node',
                fromChoiceId: 'ghost-choice',
                toNodeId: END_NODE_ID,
                outcome: 'at_risk',
            },
        ];
        const edges = buildEdgesFromTransitions(tree);
        expect(edges).toHaveLength(1);
        expect(edges[0].label).toBe('ghost-choice  →  END (at_risk)');
        expect(edges[0].style).toEqual({ strokeWidth: 2 });
    });

    it('buildTransitionsFromEdges preserves prior outcome for END targets without a choice node', () => {
        const edges = [
            {
                id: 'orphan-end',
                source: 'missing-node',
                target: END_NODE_ID,
                sourceHandle: `${CHOICE_HANDLE_PREFIX}ghost-choice`,
            },
        ];
        const existing = [
            {
                id: 'orphan-end',
                fromNodeId: 'missing-node',
                fromChoiceId: 'ghost-choice',
                toNodeId: END_NODE_ID,
                outcome: 'safe' as const,
            },
        ];
        expect(buildTransitionsFromEdges(edges, existing)).toEqual([
            {
                id: 'orphan-end',
                fromNodeId: 'missing-node',
                fromChoiceId: 'ghost-choice',
                toNodeId: END_NODE_ID,
                outcome: 'safe',
            },
        ]);
    });
});
