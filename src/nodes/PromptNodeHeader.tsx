import { getEditorHints, type EditorNode } from '@signalsafe/tree-spec-editor-core';

import { NODE_DRAG_HANDLE_CLASS } from '../canvas/constants';
import {
    EDITOR_CARD_HEADER_MUTED,
    EDITOR_FLEX_ALIGN_START,
    EDITOR_FLEX_BETWEEN,
    EDITOR_FLEX_GROW_1,
    EDITOR_FLEX_ROW,
    EDITOR_FLEX_SHRINK_0,
    EDITOR_ICON,
    EDITOR_MIN_W_0,
    EDITOR_MUTED,
    EDITOR_OVERFLOW_HIDDEN,
    EDITOR_SPACING_GAP_1,
    EDITOR_SPACING_GAP_2,
    EDITOR_SPACING_MS_1,
    EDITOR_SPACING_PX_2,
    EDITOR_SPACING_PY_2,
    EDITOR_TEXT_BOLD,
    EDITOR_TEXT_MD,
    EDITOR_TEXT_XS,
    joinClasses,
} from '../ui/editorClasses';
import { PromptNodeIssueBadges } from './PromptNodeIssueBadges';
import type { PromptNodeData } from './types';

export function PromptNodeHeader({
    node,
    data,
    editor,
    locked,
    readOnly,
}: Readonly<{
    node: EditorNode;
    data: PromptNodeData;
    editor: ReturnType<typeof getEditorHints>;
    locked: boolean;
    readOnly: boolean;
}>) {
    return (
        <div
            className={joinClasses(
                EDITOR_CARD_HEADER_MUTED,
                EDITOR_SPACING_PY_2,
                EDITOR_SPACING_PX_2,
                EDITOR_MIN_W_0,
                EDITOR_FLEX_SHRINK_0,
            )}
        >
            <div className={joinClasses(EDITOR_FLEX_BETWEEN, EDITOR_FLEX_ALIGN_START, EDITOR_SPACING_GAP_2, EDITOR_MIN_W_0)}>
                <div
                    className={joinClasses(
                        EDITOR_FLEX_ROW,
                        EDITOR_FLEX_ALIGN_START,
                        EDITOR_SPACING_GAP_1,
                        EDITOR_MIN_W_0,
                        EDITOR_FLEX_GROW_1,
                        EDITOR_OVERFLOW_HIDDEN,
                    )}
                >
                    {locked || readOnly ? null : (
                        <span
                            className={joinClasses(NODE_DRAG_HANDLE_CLASS, EDITOR_FLEX_SHRINK_0)}
                            title="Drag node"
                            aria-label="Drag node"
                        >
                            <span className={joinClasses(EDITOR_ICON, 'graph-editor-icon--grip')} aria-hidden>
                                ⋮⋮
                            </span>
                        </span>
                    )}
                    <div className={joinClasses(EDITOR_MIN_W_0, EDITOR_FLEX_GROW_1, EDITOR_OVERFLOW_HIDDEN)}>
                        <div className={joinClasses(EDITOR_TEXT_BOLD, EDITOR_TEXT_MD)}>
                            {data.isStart ? '▶ ' : ''}
                            {node.type}
                            {editor.locked ? (
                                <span
                                    className={joinClasses(EDITOR_ICON, 'graph-editor-icon--lock', EDITOR_SPACING_MS_1)}
                                    title="Locked"
                                    aria-hidden
                                >
                                    🔒
                                </span>
                            ) : null}
                            <PromptNodeIssueBadges
                                issuesTotal={data.issuesTotal}
                                issuesErrors={data.issuesErrors}
                                issuesWarnings={data.issuesWarnings}
                                issuesInfo={data.issuesInfo}
                            />
                        </div>
                    </div>
                </div>
                <div className={joinClasses(EDITOR_MUTED, EDITOR_TEXT_XS, EDITOR_FLEX_SHRINK_0)}>{node.id.slice(0, 8)}</div>
            </div>
        </div>
    );
}
