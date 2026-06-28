import { type DragEvent, type MouseEvent } from 'react';
import { Handle, Position } from 'reactflow';

import { type EditorChoice } from '@signalsafe/tree-spec-editor-core';

import {
    CANVAS_NODE_SELECTED_CLASS,
    CANVAS_NODE_SELECTED_TEXT_CLASS,
    CANVAS_CHOICE_SELECTED_CLASS,
    CHOICE_DRAG_HANDLE_CLASS,
    CHOICE_DRAG_HANDLE_SELECTOR,
    CHOICE_DROP_TARGET_CLASS,
    CHOICE_HANDLE_CLASS,
    CHOICE_ROW_CLASS,
    CHOICE_ROW_SELECT_CLASS,
    CHOICE_ROW_SELECTABLE_CLASS,
    CHOICE_HANDLE_PREFIX,
} from '../canvas/constants.js';
import { useGraphEditorCanvas } from '../GraphEditorCanvasContext.js';
import {
    EDITOR_FLEX_ALIGN_CENTER,
    EDITOR_FLEX_GROW_1,
    EDITOR_FLEX_ROW,
    EDITOR_FLEX_SHRINK_0,
    EDITOR_ICON,
    EDITOR_LIST_ITEM,
    EDITOR_MIN_W_0,
    EDITOR_SPACING_GAP_1,
    EDITOR_SPACING_P_0,
    EDITOR_SPACING_PX_2,
    EDITOR_SPACING_PY_2,
    EDITOR_TEXT_START,
    EDITOR_W_FULL,
    editorBadgeToneClass,
    joinClasses,
} from '../ui/editorClasses.js';

export function ChoiceCanvasRow({
    nodeId,
    choice,
    choiceIndex,
    focusChoiceId,
    choiceTextClass,
    readOnly,
}: Readonly<{
    nodeId: string;
    choice: EditorChoice;
    choiceIndex: number;
    focusChoiceId: string | null;
    choiceTextClass: string;
    readOnly: boolean;
}>) {
    const {
        choiceDrag,
        choiceDropTarget,
        onSelectChoice,
        onChoiceDragStart,
        onChoiceDragEnd,
        onChoiceDragOver,
        onChoiceDrop,
    } = useGraphEditorCanvas();

    const isFocused = focusChoiceId === choice.id;
    const isDropTarget =
        Boolean(choiceDrag) &&
        choiceDropTarget?.nodeId === nodeId &&
        choiceDropTarget.index === choiceIndex;

    const handleDragOver = (event: DragEvent<HTMLLIElement>) => {
        if (readOnly || !choiceDrag) return;
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'move';
        onChoiceDragOver(nodeId, choiceIndex);
    };

    const handleDrop = (event: DragEvent<HTMLLIElement>) => {
        if (readOnly || !choiceDrag) return;
        event.preventDefault();
        event.stopPropagation();
        onChoiceDrop(nodeId, choiceIndex);
    };

    const handleChoiceSelect = (event: MouseEvent<HTMLElement>) => {
        if (readOnly) return;
        const target = event.target;
        if (
            target != null &&
            typeof target === 'object' &&
            'closest' in target &&
            typeof (target as Element).closest === 'function' &&
            (target as Element).closest(CHOICE_DRAG_HANDLE_SELECTOR)
        ) {
            return;
        }
        event.stopPropagation();
        onSelectChoice(nodeId, choice.id);
    };

    return (
        <li
            className={joinClasses(
                EDITOR_LIST_ITEM,
                EDITOR_SPACING_P_0,
                'graph-editor-list__item--plain',
                isDropTarget && CHOICE_DROP_TARGET_CLASS,
            )}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <div
                className={joinClasses(
                    EDITOR_FLEX_ROW,
                    EDITOR_FLEX_ALIGN_CENTER,
                    EDITOR_SPACING_GAP_1,
                    EDITOR_MIN_W_0,
                    EDITOR_SPACING_PY_2,
                    EDITOR_SPACING_PX_2,
                    EDITOR_W_FULL,
                    CHOICE_ROW_CLASS,
                    isFocused && CANVAS_CHOICE_SELECTED_CLASS,
                    isFocused && CANVAS_NODE_SELECTED_CLASS,
                    isFocused && CANVAS_NODE_SELECTED_TEXT_CLASS,
                )}
            >
                {readOnly ? null : (
                    <button
                        type="button"
                        className={joinClasses(CHOICE_DRAG_HANDLE_CLASS, EDITOR_FLEX_SHRINK_0)}
                        draggable
                        onDragStart={(event) => {
                            event.stopPropagation();
                            onChoiceDragStart(nodeId, choice.id);
                            event.dataTransfer.effectAllowed = 'move';
                            event.dataTransfer.setData('text/plain', `${nodeId}::${choice.id}`);
                        }}
                        onDragEnd={() => onChoiceDragEnd()}
                        onClick={(event) => event.stopPropagation()}
                        title="Drag to reorder or move to another node"
                        aria-label="Drag choice"
                    >
                        <span className={joinClasses(EDITOR_ICON, 'graph-editor-icon--grip')} aria-hidden>
                            ⋮⋮
                        </span>
                    </button>
                )}
                <button
                    type="button"
                    className={joinClasses(
                        CHOICE_ROW_SELECT_CLASS,
                        EDITOR_TEXT_START,
                        EDITOR_FLEX_GROW_1,
                        EDITOR_MIN_W_0,
                        EDITOR_FLEX_ROW,
                        EDITOR_FLEX_ALIGN_CENTER,
                        EDITOR_SPACING_GAP_1,
                        readOnly ? '' : CHOICE_ROW_SELECTABLE_CLASS,
                    )}
                    disabled={readOnly}
                    onClick={handleChoiceSelect}
                    onKeyDown={(event) => {
                        if (readOnly) return;
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            event.stopPropagation();
                            onSelectChoice(nodeId, choice.id);
                        }
                    }}
                >
                    <span className={joinClasses(choiceTextClass, EDITOR_FLEX_GROW_1, EDITOR_MIN_W_0)} title={choice.label}>
                        {choice.label}
                    </span>
                    <span className={joinClasses(editorBadgeToneClass('neutral'), EDITOR_FLEX_SHRINK_0)}>{choice.id}</span>
                </button>
                <Handle
                    type="source"
                    position={Position.Right}
                    id={`${CHOICE_HANDLE_PREFIX}${choice.id}`}
                    className={CHOICE_HANDLE_CLASS}
                />
            </div>
        </li>
    );
}
