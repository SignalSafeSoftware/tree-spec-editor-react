import { GRAPH_SELECTION_KIND, type GraphSelection } from '@signalsafe/tree-spec-editor-core';

export function resolveCanvasFocusChoiceId(
    nodeId: string,
    selected: GraphSelection | undefined,
    focusNodeId: string | null | undefined,
    focusChoiceId: string | null | undefined,
): string | null {
    if (!focusChoiceId) return null;
    if (selected?.kind === GRAPH_SELECTION_KIND.NODE && selected.id === nodeId) {
        return focusChoiceId;
    }
    if (selected?.kind === GRAPH_SELECTION_KIND.EDGE && focusNodeId === nodeId) {
        return focusChoiceId;
    }
    return null;
}
