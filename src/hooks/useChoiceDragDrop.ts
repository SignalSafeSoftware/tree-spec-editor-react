import { useCallback, useState } from 'react';

import { GRAPH_SELECTION_KIND, type GraphSelection } from '@signalsafe/tree-spec-editor-core';

export type ChoiceDragState = {
    sourceNodeId: string;
    choiceId: string;
};

export type ChoiceDropTarget = {
    nodeId: string;
    index: number;
};

export type UseChoiceDragDropOptions = {
    readOnly: boolean;
    onChoiceSelect?: (nodeId: string, choiceId: string) => void;
    onSelect?: (sel: GraphSelection) => void;
    onRepositionChoice?: (
        fromNodeId: string,
        choiceId: string,
        toNodeId: string,
        toIndex: number,
    ) => void;
};

export type UseChoiceDragDropResult = {
    choiceDrag: ChoiceDragState | null;
    choiceDropTarget: ChoiceDropTarget | null;
    handleChoiceDragStart: (nodeId: string, choiceId: string) => void;
    handleChoiceDragEnd: () => void;
    handleChoiceDragOver: (nodeId: string, index: number) => void;
    handleChoiceDrop: (targetNodeId: string, targetIndex: number) => void;
};

export function useChoiceDragDrop(options: UseChoiceDragDropOptions): UseChoiceDragDropResult {
    const { readOnly, onChoiceSelect, onSelect, onRepositionChoice } = options;

    const [choiceDrag, setChoiceDrag] = useState<ChoiceDragState | null>(null);
    const [choiceDropTarget, setChoiceDropTarget] = useState<ChoiceDropTarget | null>(null);

    const handleChoiceDragStart = useCallback(
        (nodeId: string, choiceId: string) => {
            if (readOnly) return;
            setChoiceDrag({ sourceNodeId: nodeId, choiceId });
            if (onChoiceSelect) {
                onChoiceSelect(nodeId, choiceId);
            } else {
                onSelect?.({ kind: GRAPH_SELECTION_KIND.NODE, id: nodeId });
            }
        },
        [readOnly, onChoiceSelect, onSelect],
    );

    const handleChoiceDragEnd = useCallback(() => {
        setChoiceDrag(null);
        setChoiceDropTarget(null);
    }, []);

    const handleChoiceDragOver = useCallback((nodeId: string, index: number) => {
        setChoiceDropTarget({ nodeId, index });
    }, []);

    const handleChoiceDrop = useCallback(
        (targetNodeId: string, targetIndex: number) => {
            if (readOnly || !choiceDrag) return;
            onRepositionChoice?.(
                choiceDrag.sourceNodeId,
                choiceDrag.choiceId,
                targetNodeId,
                targetIndex,
            );
            setChoiceDrag(null);
            setChoiceDropTarget(null);
        },
        [readOnly, choiceDrag, onRepositionChoice],
    );

    return {
        choiceDrag,
        choiceDropTarget,
        handleChoiceDragStart,
        handleChoiceDragEnd,
        handleChoiceDragOver,
        handleChoiceDrop,
    };
}
