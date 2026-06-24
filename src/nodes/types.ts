import type { EditorNode } from '@signalsafe/tree-spec-editor-core';

export type PromptNodeData = {
    node: EditorNode;
    isStart: boolean;
    issuesTotal: number;
    issuesErrors: number;
    issuesWarnings: number;
    issuesInfo: number;
    focusChoiceId?: string | null;
    /** Transient height lock while the user is dragging a resize handle. */
    lockedResizeHeight?: number;
};
