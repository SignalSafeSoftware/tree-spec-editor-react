import { useCallback, useEffect, type CSSProperties } from 'react';
import { Handle, NodeResizer, Position, useUpdateNodeInternals, type NodeProps } from 'reactflow';

import {
    editorHintsToStyle,
    getEditorHints,
    nodeTextWrapClassName,
    resolveNodeTextWrap,
} from '@signalsafe/tree-spec-editor-core';

import {
    CANVAS_NODE_BODY_CLASS,
    CANVAS_NODE_CARD_CLASS,
    CANVAS_NODE_SELECTED_CLASS,
    CANVAS_NODE_SELECTED_TEXT_CLASS,
    MIN_NODE_HEIGHT,
    MAX_NODE_HEIGHT,
    MIN_NODE_WIDTH,
    MAX_NODE_WIDTH,
    TARGET_HANDLE_CLASS_DEFAULT,
    TARGET_HANDLE_ID,
} from '../canvas/constants.js';
import { getPromptNodeBorderClass } from '../canvas/edgeStyle.js';
import { useGraphEditorCanvas } from '../GraphEditorCanvasContext.js';
import {
    EDITOR_CARD_BODY,
    EDITOR_MIN_W_0,
    EDITOR_MUTED,
    EDITOR_SPACING_MB_0,
    EDITOR_SPACING_PX_2,
    EDITOR_SPACING_PY_2,
    EDITOR_TEXT_SM,
    joinClasses,
} from '../ui/editorClasses.js';
import { PromptNodeChoicesList } from './PromptNodeChoicesList.js';
import { PromptNodeHeader } from './PromptNodeHeader.js';
import { PromptNodeToolbar } from './PromptNodeToolbar.js';
import type { PromptNodeData } from './types.js';

type PromptNodeProps = Readonly<NodeProps<PromptNodeData>>;

export function PromptNode({ data, selected, id }: PromptNodeProps) {
    const n = data.node;
    const choices = n.choices ?? [];
    const updateNodeInternals = useUpdateNodeInternals();
    const { readOnly, onDuplicateNode, onDeleteNode, onResizeNode, onResizeNodeStart, choiceDrag, choiceDropTarget, onChoiceDragOver, onChoiceDrop } =
        useGraphEditorCanvas();
    const hasErrors = data.issuesErrors > 0;
    const borderClass = getPromptNodeBorderClass(hasErrors, data.issuesWarnings);
    const focusChoiceId = data.focusChoiceId ?? null;
    const showNodeHighlight = selected && !focusChoiceId;
    const editor = getEditorHints(n);
    const appearanceStyle = editorHintsToStyle(editor);
    const textWrap = resolveNodeTextWrap(editor);
    const promptTextClass = nodeTextWrapClassName(textWrap, 'block');
    const choiceTextClass = nodeTextWrapClassName(textWrap, 'flex');
    const locked = editor.locked === true;
    const canEditCanvas = selected && !readOnly && !locked;
    const cardStyle: CSSProperties = {
        ...appearanceStyle,
        width: '100%',
        height: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
    };
    const scrollBodyStyle: CSSProperties | undefined =
        editor.height !== undefined || data.lockedResizeHeight !== undefined
            ? { flex: '1 1 auto', minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }
            : undefined;

    useEffect(() => {
        updateNodeInternals(id);
    }, [id, choices.length, editor.height, editor.width, updateNodeInternals]);

    const handleResize = useCallback(() => {
        updateNodeInternals(id);
    }, [id, updateNodeInternals]);

    return (
        <>
            {canEditCanvas ? (
                <PromptNodeToolbar
                    nodeId={id}
                    onDuplicateNode={onDuplicateNode}
                    onDeleteNode={onDeleteNode}
                />
            ) : null}
            {canEditCanvas ? (
                <NodeResizer
                    minWidth={MIN_NODE_WIDTH}
                    maxWidth={MAX_NODE_WIDTH}
                    minHeight={MIN_NODE_HEIGHT}
                    maxHeight={MAX_NODE_HEIGHT}
                    onResizeStart={(_event, params) => {
                        onResizeNodeStart(id, params.width, params.height);
                    }}
                    onResize={handleResize}
                    onResizeEnd={(_event, params) => {
                        onResizeNode(id, params.width, params.height);
                    }}
                />
            ) : null}
            <div
                className={joinClasses(
                    CANVAS_NODE_CARD_CLASS,
                    borderClass,
                    showNodeHighlight && CANVAS_NODE_SELECTED_CLASS,
                    showNodeHighlight && CANVAS_NODE_SELECTED_TEXT_CLASS,
                )}
                style={cardStyle}
            >
                <Handle
                    type="target"
                    position={Position.Left}
                    id={TARGET_HANDLE_ID}
                    className={TARGET_HANDLE_CLASS_DEFAULT}
                />
                <PromptNodeHeader
                    node={n}
                    data={data}
                    editor={editor}
                    locked={locked}
                    readOnly={readOnly}
                />
                <div className={joinClasses(CANVAS_NODE_BODY_CLASS, EDITOR_MIN_W_0)} style={scrollBodyStyle}>
                    <div className={joinClasses(EDITOR_CARD_BODY, EDITOR_SPACING_PY_2, EDITOR_SPACING_PX_2, EDITOR_MIN_W_0, 'nodrag')}>
                        <div
                            className={joinClasses(EDITOR_TEXT_SM, EDITOR_SPACING_MB_0, promptTextClass)}
                            title={n.prompt || undefined}
                        >
                            {n.prompt || <em className={EDITOR_MUTED}>(empty prompt)</em>}
                        </div>
                    </div>
                    <PromptNodeChoicesList
                        nodeId={id}
                        choices={choices}
                        focusChoiceId={focusChoiceId}
                        choiceTextClass={choiceTextClass}
                        readOnly={readOnly}
                        choiceDrag={choiceDrag}
                        choiceDropTarget={choiceDropTarget}
                        onChoiceDragOver={onChoiceDragOver}
                        onChoiceDrop={onChoiceDrop}
                    />
                </div>
            </div>
        </>
    );
}
