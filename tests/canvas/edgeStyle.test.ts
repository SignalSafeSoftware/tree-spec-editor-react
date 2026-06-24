import { describe, expect, it } from 'vitest';

import {
    buildEdgeMarker,
    buildEdgeStyle,
    getIssueEdgeStyle,
    getPromptNodeBorderClass,
    resolveEdgePathStroke,
    resolveSelectedEdgeStroke,
} from '../../src/canvas/edgeStyle';
import { BORDER_DANGER_CLASS, BORDER_WARNING_CLASS, SELECTED_EDGE_STROKE } from '../../src/canvas/constants';

describe('edgeStyle', () => {
    it('getPromptNodeBorderClass returns danger, warning, or empty', () => {
        expect(getPromptNodeBorderClass(true, 0)).toBe(BORDER_DANGER_CLASS);
        expect(getPromptNodeBorderClass(false, 2)).toBe(BORDER_WARNING_CLASS);
        expect(getPromptNodeBorderClass(false, 0)).toBe('');
    });

    it('getIssueEdgeStyle adds dash styling when an issue is present', () => {
        expect(getIssueEdgeStyle({ stroke: 'blue' }, false)).toEqual({ stroke: 'blue' });
        expect(getIssueEdgeStyle({ stroke: 'blue' }, true)).toMatchObject({
            stroke: 'blue',
            strokeWidth: 2,
            strokeDasharray: '6 4',
        });
    });

    it('resolveEdgePathStroke falls back to the default canvas stroke', () => {
        expect(resolveEdgePathStroke({ stroke: '#112233' })).toBe('#112233');
        expect(resolveEdgePathStroke(undefined)).toBeTruthy();
        expect(resolveEdgePathStroke({ strokeWidth: 2 })).toBeTruthy();
    });

    it('buildEdgeMarker copies the arrow marker with the stroke color', () => {
        expect(buildEdgeMarker('#aabbcc')).toMatchObject({ color: '#aabbcc' });
    });

    it('buildEdgeStyle omits stroke when strokeColor is undefined', () => {
        expect(buildEdgeStyle(undefined)).toEqual({ strokeWidth: 2 });
        expect(buildEdgeStyle('#ff0000')).toEqual({ stroke: '#ff0000', strokeWidth: 2 });
    });

    it('resolveSelectedEdgeStroke applies selected stroke when the edge is selected', () => {
        const unselected = resolveSelectedEdgeStroke({ stroke: 'blue', strokeWidth: 2 }, false);
        expect(unselected.stroke).toBe('blue');
        expect(unselected.style).toEqual({ stroke: 'blue', strokeWidth: 2 });

        const selected = resolveSelectedEdgeStroke({ stroke: 'blue', strokeWidth: 2 }, true);
        expect(selected.stroke).toBe(SELECTED_EDGE_STROKE);
        expect(selected.style).toMatchObject({ stroke: SELECTED_EDGE_STROKE, strokeWidth: 2 });
    });
});
