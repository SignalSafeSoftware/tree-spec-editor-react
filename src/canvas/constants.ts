import { MarkerType } from 'reactflow';

import { joinClasses } from '../utils/joinClasses';
import { EDITOR_CARD, EDITOR_DROPDOWN_MENU, EDITOR_ROUNDED } from '../ui/editorClasses';

/** Background highlight when the node matches editor selection (sidebar / issues / canvas). */
export const CANVAS_NODE_SELECTED_CLASS = 'graph-editor-canvas__selected';

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

export const TARGET_HANDLE_CLASS_DEFAULT = 'graph-editor-target-handle graph-editor-target-handle--default';
export const TARGET_HANDLE_CLASS_DANGER = 'graph-editor-target-handle graph-editor-target-handle--danger';

export const CONTEXT_MENU_CLASS = joinClasses(
    'graph-editor-context-menu',
    EDITOR_DROPDOWN_MENU,
    'graph-editor-dropdown__menu--open',
    'graph-editor-context-menu--fixed',
    'graph-editor-shadow--sm',
);

export const REACT_FLOW_PANE_CLASS = 'react-flow__pane';

export const BORDER_DANGER_CLASS = 'graph-editor-canvas-node--border-danger';
export const BORDER_WARNING_CLASS = 'graph-editor-canvas-node--border-warning';

export const END_NODE_WIDTH_CLASS = 'graph-editor-canvas-node--end-width';

export const CANVAS_NODE_CARD_CLASS = joinClasses(EDITOR_CARD, EDITOR_ROUNDED, CANVAS_NODE_CLASS);

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
