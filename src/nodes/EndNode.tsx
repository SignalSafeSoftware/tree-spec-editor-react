import { Handle, Position, type NodeProps } from 'reactflow';

import {
    BORDER_DANGER_CLASS,
    CANVAS_NODE_CLASS,
    CANVAS_NODE_SELECTED_CLASS,
    CANVAS_NODE_SELECTED_TEXT_CLASS,
    END_NODE_WIDTH_CLASS,
    TARGET_HANDLE_CLASS_DANGER,
    TARGET_HANDLE_ID,
} from '../canvas/constants';
import { joinClasses } from '../utils/joinClasses';

export function EndNode({ selected }: NodeProps) {
    return (
        <div
            className={joinClasses(
                'card',
                'rounded',
                CANVAS_NODE_CLASS,
                BORDER_DANGER_CLASS,
                END_NODE_WIDTH_CLASS,
                selected && CANVAS_NODE_SELECTED_CLASS,
                selected && CANVAS_NODE_SELECTED_TEXT_CLASS,
            )}
        >
            <Handle type="target" position={Position.Left} id={TARGET_HANDLE_ID} className={TARGET_HANDLE_CLASS_DANGER} />
            <div className="card-body p-2 text-center">
                <div className="fw-bold text-danger">END</div>
                <div className="text-muted font-size-12">Outcome required</div>
            </div>
        </div>
    );
}
