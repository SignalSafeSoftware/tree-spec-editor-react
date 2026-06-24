import { getEditorHints, type EditorNode } from '@signalsafe/tree-spec-editor-core';

import { NODE_DRAG_HANDLE_CLASS } from '../canvas/constants';
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
        <div className="card-header bg-body-secondary py-2 px-2 min-w-0 flex-shrink-0">
            <div className="d-flex justify-content-between align-items-start gap-2 min-w-0">
                <div className="d-flex align-items-start gap-1 min-w-0 flex-grow-1 overflow-hidden">
                    {locked || readOnly ? null : (
                        <span
                            className={`${NODE_DRAG_HANDLE_CLASS} flex-shrink-0`}
                            title="Drag node"
                            aria-label="Drag node"
                        >
                            <i className="bi bi-grip-vertical" aria-hidden />
                        </span>
                    )}
                    <div className="min-w-0 flex-grow-1 overflow-hidden">
                        <div className="fw-bold font-size-13">
                            {data.isStart ? '▶ ' : ''}
                            {node.type}
                            {editor.locked ? (
                                <i className="bi bi-lock-fill ms-1 text-secondary" title="Locked" aria-hidden />
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
                <div className="text-muted font-size-11 flex-shrink-0">{node.id.slice(0, 8)}</div>
            </div>
        </div>
    );
}
