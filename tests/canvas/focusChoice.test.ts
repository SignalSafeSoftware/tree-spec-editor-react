import { describe, expect, it } from 'vitest';

import { GRAPH_SELECTION_KIND } from '@signalsafe/tree-spec-editor-core';

import { resolveCanvasFocusChoiceId } from '../../src/canvas/focusChoice';

describe('resolveCanvasFocusChoiceId', () => {
    it('returns null when focusChoiceId is not set', () => {
        expect(
            resolveCanvasFocusChoiceId('n1', { kind: GRAPH_SELECTION_KIND.NODE, id: 'n1' }, 'n1', null),
        ).toBeNull();
    });

    it('returns focusChoiceId when node is selected', () => {
        expect(
            resolveCanvasFocusChoiceId(
                'n1',
                { kind: GRAPH_SELECTION_KIND.NODE, id: 'n1' },
                'n1',
                'c1',
            ),
        ).toBe('c1');
    });

    it('returns null when node is selected but ids differ', () => {
        expect(
            resolveCanvasFocusChoiceId(
                'n2',
                { kind: GRAPH_SELECTION_KIND.NODE, id: 'n1' },
                'n1',
                'c1',
            ),
        ).toBeNull();
    });

    it('returns focusChoiceId when edge is selected and focusNodeId matches', () => {
        expect(
            resolveCanvasFocusChoiceId(
                'n1',
                { kind: GRAPH_SELECTION_KIND.EDGE, id: 'e1' },
                'n1',
                'c2',
            ),
        ).toBe('c2');
    });

    it('returns null when edge is selected but focusNodeId differs', () => {
        expect(
            resolveCanvasFocusChoiceId(
                'n2',
                { kind: GRAPH_SELECTION_KIND.EDGE, id: 'e1' },
                'n1',
                'c2',
            ),
        ).toBeNull();
    });
});
