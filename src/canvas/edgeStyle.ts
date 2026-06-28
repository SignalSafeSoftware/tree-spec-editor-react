import { DEFAULT_CANVAS_EDGE_STROKE } from '@signalsafe/tree-spec-editor-core';
import type { Edge } from 'reactflow';

import { BORDER_DANGER_CLASS, BORDER_WARNING_CLASS, EDGE_ARROW_MARKER, SELECTED_EDGE_STROKE } from './constants.js';

export function getPromptNodeBorderClass(hasErrors: boolean, warningCount: number): string {
    if (hasErrors) {
        return BORDER_DANGER_CLASS;
    }
    if (warningCount > 0) {
        return BORDER_WARNING_CLASS;
    }
    return '';
}

export function getIssueEdgeStyle(style: Edge['style'], hasIssue: boolean): Edge['style'] {
    if (!hasIssue) {
        return style;
    }
    return {
        ...style,
        strokeWidth: 2,
        strokeDasharray: '6 4',
    };
}

export function resolveEdgePathStroke(style: Edge['style'] | undefined): string {
    if (style?.stroke && typeof style.stroke === 'string') {
        return style.stroke;
    }
    return DEFAULT_CANVAS_EDGE_STROKE;
}

export function buildEdgeMarker(stroke: string) {
    return {
        ...EDGE_ARROW_MARKER,
        color: stroke,
    };
}

export function buildEdgeStyle(strokeColor: string | undefined): Edge['style'] {
    return strokeColor ? { stroke: strokeColor, strokeWidth: 2 } : { strokeWidth: 2 };
}

export function resolveSelectedEdgeStroke(
    style: Edge['style'],
    isEdgeSelected: boolean,
): { style: Edge['style']; stroke: string } {
    let nextStyle = style;
    const stroke = isEdgeSelected ? SELECTED_EDGE_STROKE : resolveEdgePathStroke(nextStyle);
    if (isEdgeSelected) {
        nextStyle = { ...nextStyle, stroke: SELECTED_EDGE_STROKE };
    }
    return { style: nextStyle, stroke };
}
