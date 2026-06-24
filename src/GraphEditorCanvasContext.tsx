import { createContext, useContext } from 'react';

export type ChoiceDropTarget = {
    nodeId: string;
    index: number;
};

export type ChoiceDragState = {
    sourceNodeId: string;
    choiceId: string;
};

export type GraphEditorCanvasContextValue = {
    readOnly: boolean;
    onDuplicateNode: (nodeId: string) => void;
    onDeleteNode: (nodeId: string) => void;
    onResizeNode: (nodeId: string, width: number, height: number) => void;
    /** Lock the node box height when a resize drag begins (prevents wrap reflow jumps). */
    onResizeNodeStart: (nodeId: string, width: number, height: number) => void;
    onSelectChoice: (nodeId: string, choiceId: string) => void;
    choiceDrag: ChoiceDragState | null;
    choiceDropTarget: ChoiceDropTarget | null;
    onChoiceDragStart: (nodeId: string, choiceId: string) => void;
    onChoiceDragEnd: () => void;
    onChoiceDragOver: (nodeId: string, index: number) => void;
    onChoiceDrop: (nodeId: string, index: number) => void;
};

const noop = () => undefined;

const defaultValue: GraphEditorCanvasContextValue = {
    readOnly: true,
    onDuplicateNode: noop,
    onDeleteNode: noop,
    onResizeNode: noop,
    onResizeNodeStart: noop,
    onSelectChoice: noop,
    choiceDrag: null,
    choiceDropTarget: null,
    onChoiceDragStart: noop,
    onChoiceDragEnd: noop,
    onChoiceDragOver: noop,
    onChoiceDrop: noop,
};

export const GraphEditorCanvasContext = createContext(defaultValue);

export function useGraphEditorCanvas(): GraphEditorCanvasContextValue {
    return useContext(GraphEditorCanvasContext);
}
