import { Handle, Position, type NodeProps } from 'reactflow';

import {
    BORDER_DANGER_CLASS,
    CANVAS_NODE_CARD_CLASS,
    CANVAS_NODE_SELECTED_CLASS,
    CANVAS_NODE_SELECTED_TEXT_CLASS,
    END_NODE_WIDTH_CLASS,
    TARGET_HANDLE_CLASS_DANGER,
    TARGET_HANDLE_ID,
} from '../canvas/constants.js';
import {
    EDITOR_CARD_BODY,
    EDITOR_MUTED,
    EDITOR_SPACING_P_2,
    EDITOR_TEXT_BOLD,
    EDITOR_TEXT_CENTER,
    EDITOR_TEXT_DANGER,
    EDITOR_TEXT_SM,
    joinClasses,
} from '../ui/editorClasses.js';

export function EndNode({ selected }: NodeProps) {
    return (
        <div
            className={joinClasses(
                CANVAS_NODE_CARD_CLASS,
                BORDER_DANGER_CLASS,
                END_NODE_WIDTH_CLASS,
                selected && CANVAS_NODE_SELECTED_CLASS,
                selected && CANVAS_NODE_SELECTED_TEXT_CLASS,
            )}
        >
            <Handle type="target" position={Position.Left} id={TARGET_HANDLE_ID} className={TARGET_HANDLE_CLASS_DANGER} />
            <div className={joinClasses(EDITOR_CARD_BODY, EDITOR_SPACING_P_2, EDITOR_TEXT_CENTER)}>
                <div className={joinClasses(EDITOR_TEXT_BOLD, EDITOR_TEXT_DANGER)}>END</div>
                <div className={joinClasses(EDITOR_MUTED, EDITOR_TEXT_SM)}>Outcome required</div>
            </div>
        </div>
    );
}
