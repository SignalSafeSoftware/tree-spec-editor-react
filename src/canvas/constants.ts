import { MarkerType } from 'reactflow';

/** Background highlight when the node matches editor selection (sidebar / issues / canvas). */
export const CANVAS_NODE_SELECTED_CLASS = 'bg-primary-subtle';

/** Dark readable text on selected canvas node cards. */
export const CANVAS_NODE_SELECTED_TEXT_CLASS = 'graph-editor-canvas-selected';

export const CANVAS_CLASS = 'graph-editor-canvas';
export const CANVAS_NODE_CLASS = 'graph-editor-canvas-node';
export const CANVAS_NODE_BODY_CLASS = 'graph-editor-canvas-node-body';
export const CANVAS_CHOICE_SELECTED_CLASS = 'graph-editor-canvas-choice-selected';

export const CHOICE_ROW_CLASS = 'graph-editor-choice-row';
export const CHOICE_ROW_SELECTOR = `.${CHOICE_ROW_CLASS}`;
export const CHOICE_DRAG_HANDLE_CLASS = 'graph-editor-choice-drag-handle';
export const CHOICE_DRAG_HANDLE_SELECTOR = `.${CHOICE_DRAG_HANDLE_CLASS}`;
export const CHOICE_DROP_TARGET_CLASS = 'graph-editor-choice-drop-target';
export const CHOICE_DROP_APPEND_CLASS = 'graph-editor-choice-drop-append';
export const CHOICE_ROW_SELECT_CLASS = 'graph-editor-choice-row-select';
export const CHOICE_ROW_SELECTABLE_CLASS = 'graph-editor-choice-row-selectable';
export const CHOICE_HANDLE_CLASS = 'graph-editor-handle graph-editor-choice-handle';

export const NODE_DRAG_HANDLE_CLASS = 'graph-editor-drag-handle';
export const NODE_DRAG_HANDLE_SELECTOR = `.${NODE_DRAG_HANDLE_CLASS}`;

export const TARGET_HANDLE_CLASS_DEFAULT = 'handle-bg-default graph-editor-target-handle';
export const TARGET_HANDLE_CLASS_DANGER = 'handle-bg-danger graph-editor-target-handle';

export const CONTEXT_MENU_CLASS = 'graph-editor-context-menu dropdown-menu show position-fixed shadow-sm';

export const REACT_FLOW_PANE_CLASS = 'react-flow__pane';

export const BORDER_DANGER_CLASS = 'border-danger';
export const BORDER_WARNING_CLASS = 'border-warning';

export const END_NODE_WIDTH_CLASS = 'w-180';

export const MIN_NODE_WIDTH = 180;
export const MAX_NODE_WIDTH = 560;
export const MIN_NODE_HEIGHT = 80;
export const MAX_NODE_HEIGHT = 480;

/** Matches React Flow selected edge stroke (`.react-flow__edge.selected .react-flow__edge-path`). */
export const SELECTED_EDGE_STROKE = '#555';

export const EDGE_ARROW_MARKER = {
    type: MarkerType.ArrowClosed,
    width: 16,
    height: 16,
};

export const TARGET_HANDLE_ID = 'in';
export const CHOICE_HANDLE_PREFIX = 'choice:';
