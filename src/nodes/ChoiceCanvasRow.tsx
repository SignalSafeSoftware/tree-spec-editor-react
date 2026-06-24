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
} from '../canvas/constants';
import { useGraphEditorCanvas } from '../GraphEditorCanvasContext';
import { joinClasses } from '../utils/joinClasses';

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
                'list-group-item p-0 border-0',
                isDropTarget && CHOICE_DROP_TARGET_CLASS,
            )}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <div
                className={joinClasses(
                    'd-flex align-items-center gap-1 min-w-0 py-2 px-2 w-100',
                    CHOICE_ROW_CLASS,
                    isFocused && CANVAS_CHOICE_SELECTED_CLASS,
                    isFocused && CANVAS_NODE_SELECTED_CLASS,
                    isFocused && CANVAS_NODE_SELECTED_TEXT_CLASS,
                )}
            >
                {readOnly ? null : (
                    <button
                        type="button"
                        className={`${CHOICE_DRAG_HANDLE_CLASS} flex-shrink-0`}
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
                        <i className="bi bi-grip-vertical" aria-hidden />
                    </button>
                )}
                <button
                    type="button"
                    className={joinClasses(
                        CHOICE_ROW_SELECT_CLASS,
                        'text-start flex-grow-1 min-w-0 d-flex align-items-center gap-1',
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
                    <span className={joinClasses(choiceTextClass, 'flex-grow-1 min-w-0')} title={choice.label}>
                        {choice.label}
                    </span>
                    <span className="badge bg-light text-dark flex-shrink-0">{choice.id}</span>
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
