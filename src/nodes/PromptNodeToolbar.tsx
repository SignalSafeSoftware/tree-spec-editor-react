import { Position, NodeToolbar } from 'reactflow';

import {
    EDITOR_BTN_GROUP,
    EDITOR_ICON,
    EDITOR_SR_ONLY,
    editorBtnToneClass,
} from '../ui/editorClasses.js';

export function PromptNodeToolbar({
    nodeId,
    onDuplicateNode,
    onDeleteNode,
}: Readonly<{
    nodeId: string;
    onDuplicateNode: (id: string) => void;
    onDeleteNode: (id: string) => void;
}>) {
    return (
        <NodeToolbar isVisible position={Position.Bottom} offset={8} align="start">
            <fieldset className={EDITOR_BTN_GROUP}>
                <legend className={EDITOR_SR_ONLY}>Node actions</legend>
                <button
                    type="button"
                    className={editorBtnToneClass('light')}
                    title="Duplicate node"
                    aria-label="Duplicate node"
                    onClick={() => onDuplicateNode(nodeId)}
                >
                    <span className={EDITOR_ICON} aria-hidden>
                        ⧉
                    </span>
                </button>
                <button
                    type="button"
                    className={editorBtnToneClass('danger')}
                    title="Delete node"
                    aria-label="Delete node"
                    onClick={() => onDeleteNode(nodeId)}
                >
                    <span className={EDITOR_ICON} aria-hidden>
                        ✕
                    </span>
                </button>
            </fieldset>
        </NodeToolbar>
    );
}
