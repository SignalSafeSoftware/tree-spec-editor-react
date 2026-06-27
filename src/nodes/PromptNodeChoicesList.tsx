import { type DragEvent } from 'react';

import { type EditorChoice } from '@signalsafe/tree-spec-editor-core';

import {
    CHOICE_DROP_APPEND_CLASS,
    CHOICE_DROP_TARGET_CLASS,
} from '../canvas/constants';
import { type GraphEditorCanvasContextValue } from '../GraphEditorCanvasContext';
import {
    EDITOR_LIST_FLUSH,
    EDITOR_LIST_ITEM_EMPTY,
    EDITOR_MIN_W_0,
    EDITOR_MUTED,
    EDITOR_SPACING_PX_2,
    EDITOR_SPACING_PY_2,
    EDITOR_TEXT_SM,
    joinClasses,
} from '../ui/editorClasses';
import { ChoiceCanvasRow } from './ChoiceCanvasRow';

export function PromptNodeChoicesList({
    nodeId,
    choices,
    focusChoiceId,
    choiceTextClass,
    readOnly,
    choiceDrag,
    choiceDropTarget,
    onChoiceDragOver,
    onChoiceDrop,
}: Readonly<{
    nodeId: string;
    choices: EditorChoice[];
    focusChoiceId: string | null;
    choiceTextClass: string;
    readOnly: boolean;
    choiceDrag: GraphEditorCanvasContextValue['choiceDrag'];
    choiceDropTarget: GraphEditorCanvasContextValue['choiceDropTarget'];
    onChoiceDragOver: GraphEditorCanvasContextValue['onChoiceDragOver'];
    onChoiceDrop: GraphEditorCanvasContextValue['onChoiceDrop'];
}>) {
    const handleListDragOver = (event: DragEvent<HTMLUListElement>) => {
        if (readOnly || !choiceDrag) return;
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'move';
        onChoiceDragOver(nodeId, choices.length);
    };

    const handleListDrop = (event: DragEvent<HTMLUListElement>) => {
        if (readOnly || !choiceDrag) return;
        event.preventDefault();
        event.stopPropagation();
        onChoiceDrop(nodeId, choices.length);
    };

    return (
        <ul
            className={joinClasses(EDITOR_LIST_FLUSH, EDITOR_TEXT_SM, EDITOR_MIN_W_0, 'nodrag')}
            aria-label="Node choices"
            onDragOver={handleListDragOver}
            onDrop={handleListDrop}
        >
            {choices.length === 0 ? (
                <li
                    className={joinClasses(
                        EDITOR_LIST_ITEM_EMPTY,
                        EDITOR_SPACING_PY_2,
                        EDITOR_SPACING_PX_2,
                        EDITOR_MUTED,
                        choiceDrag && CHOICE_DROP_TARGET_CLASS,
                    )}
                >
                    <em>No choices</em>
                </li>
            ) : (
                choices.map((c, choiceIndex) => (
                    <ChoiceCanvasRow
                        key={c.id}
                        nodeId={nodeId}
                        choice={c}
                        choiceIndex={choiceIndex}
                        focusChoiceId={focusChoiceId}
                        choiceTextClass={choiceTextClass}
                        readOnly={readOnly}
                    />
                ))
            )}
            {choiceDrag && readOnly === false && choices.length > 0 ? (
                <li
                    className={joinClasses(
                        CHOICE_DROP_APPEND_CLASS,
                        'graph-editor-list__append-target',
                        choiceDropTarget?.nodeId === nodeId &&
                            choiceDropTarget.index === choices.length &&
                            CHOICE_DROP_TARGET_CLASS,
                    )}
                    aria-hidden
                />
            ) : null}
        </ul>
    );
}
