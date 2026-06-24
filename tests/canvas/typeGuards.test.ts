import { describe, expect, it } from 'vitest';

import { CHOICE_ROW_SELECTOR, REACT_FLOW_PANE_CLASS } from '../../src/canvas/constants';
import { isChoiceRowClickTarget, isReactFlowPaneTarget } from '../../src/canvas/typeGuards';

describe('typeGuards', () => {
    describe('isChoiceRowClickTarget', () => {
        it('returns false for null and non-element targets', () => {
            expect(isChoiceRowClickTarget(null)).toBe(false);
            expect(isChoiceRowClickTarget({})).toBe(false);
        });

        it('returns true when closest matches the choice row selector', () => {
            const target = {
                closest: (selector: string) => (selector === CHOICE_ROW_SELECTOR ? target : null),
            };
            expect(isChoiceRowClickTarget(target)).toBe(true);
        });

        it('returns false when closest does not match', () => {
            const target = {
                closest: () => null,
            };
            expect(isChoiceRowClickTarget(target)).toBe(false);
        });
    });

    describe('isReactFlowPaneTarget', () => {
        it('returns false for null and invalid targets', () => {
            expect(isReactFlowPaneTarget(null)).toBe(false);
            expect(isReactFlowPaneTarget({})).toBe(false);
        });

        it('returns true when classList contains react-flow pane class', () => {
            const target = {
                classList: {
                    contains: (value: string) => value === REACT_FLOW_PANE_CLASS,
                },
            };
            expect(isReactFlowPaneTarget(target)).toBe(true);
        });

        it('returns false for non-pane targets', () => {
            const target = {
                classList: {
                    contains: () => false,
                },
            };
            expect(isReactFlowPaneTarget(target)).toBe(false);
        });
    });
});
