/** UI-kit agnostic canvas class hooks (aligned with @signalsafe/tree-spec-editor). */

import { joinClasses } from '../utils/joinClasses.js';

export { joinClasses };

export const EDITOR_CARD = 'graph-editor-card';
export const EDITOR_CARD_HEADER = 'graph-editor-card__header';
export const EDITOR_CARD_BODY = 'graph-editor-card__body';
export const EDITOR_CARD_HEADER_MUTED = 'graph-editor-card__header graph-editor-surface--muted';

export const EDITOR_LIST = 'graph-editor-list';
export const EDITOR_LIST_FLUSH = 'graph-editor-list graph-editor-list--flush';
export const EDITOR_LIST_ITEM = 'graph-editor-list__item';
export const EDITOR_LIST_ITEM_EMPTY = 'graph-editor-list__item graph-editor-list__item--empty';

export const EDITOR_BTN = 'graph-editor-btn';
export const EDITOR_BTN_GROUP = 'graph-editor-btn-group graph-editor-btn-group--sm';
export const EDITOR_BADGE = 'graph-editor-badge';

export const EDITOR_DROPDOWN_MENU = 'graph-editor-dropdown__menu';
export const EDITOR_DROPDOWN_ITEM = 'graph-editor-dropdown__item';

export const EDITOR_FLEX = 'graph-editor-flex';
export const EDITOR_FLEX_BETWEEN = 'graph-editor-flex graph-editor-flex--between';
export const EDITOR_FLEX_ROW = 'graph-editor-flex graph-editor-flex--row';
export const EDITOR_FLEX_ALIGN_START = 'graph-editor-flex graph-editor-flex--align-start';
export const EDITOR_FLEX_ALIGN_CENTER = 'graph-editor-flex graph-editor-flex--align-center';
export const EDITOR_MIN_W_0 = 'graph-editor-min-w-0';
export const EDITOR_FLEX_SHRINK_0 = 'graph-editor-flex-shrink-0';
export const EDITOR_FLEX_GROW_1 = 'graph-editor-flex-grow-1';
export const EDITOR_OVERFLOW_HIDDEN = 'graph-editor-overflow-hidden';
export const EDITOR_W_FULL = 'graph-editor-w-full';

export const EDITOR_MUTED = 'graph-editor-muted';
export const EDITOR_TEXT_DANGER = 'graph-editor-text--danger';
export const EDITOR_TEXT_CENTER = 'graph-editor-text--center';
export const EDITOR_TEXT_START = 'graph-editor-text--start';
export const EDITOR_TEXT_BOLD = 'graph-editor-text--bold';
export const EDITOR_TEXT_XS = 'graph-editor-text--xs';
export const EDITOR_TEXT_SM = 'graph-editor-text--sm';
export const EDITOR_TEXT_MD = 'graph-editor-text--md';

export const EDITOR_SPACING_PY_2 = 'graph-editor-spacing--py-2';
export const EDITOR_SPACING_PX_2 = 'graph-editor-spacing--px-2';
export const EDITOR_SPACING_P_2 = 'graph-editor-spacing--p-2';
export const EDITOR_SPACING_GAP_1 = 'graph-editor-spacing--gap-1';
export const EDITOR_SPACING_GAP_2 = 'graph-editor-spacing--gap-2';
export const EDITOR_SPACING_MB_0 = 'graph-editor-spacing--mb-0';
export const EDITOR_SPACING_MS_1 = 'graph-editor-spacing--ms-1';
export const EDITOR_SPACING_MS_2 = 'graph-editor-spacing--ms-2';
export const EDITOR_SPACING_ME_1 = 'graph-editor-spacing--me-1';
export const EDITOR_SPACING_P_0 = 'graph-editor-spacing--p-0';
export const EDITOR_SPACING_M_0 = 'graph-editor-spacing--m-0';

export const EDITOR_ROUNDED = 'graph-editor-rounded';
export const EDITOR_SR_ONLY = 'graph-editor-sr-only';
export const EDITOR_ICON = 'graph-editor-icon';

export const EDITOR_CANVAS_ROOT = 'graph-editor-canvas-root';

export function editorBtnToneClass(variant?: string): string {
    const tone = normalizeBtnTone(variant);
    return `${EDITOR_BTN} graph-editor-btn--${tone}`;
}

export function editorBadgeToneClass(variant: 'danger' | 'warning' | 'info' | 'neutral'): string {
    return `${EDITOR_BADGE} graph-editor-badge--${variant}`;
}

export function editorDropdownItemClass(danger?: boolean): string {
    return joinClasses(EDITOR_DROPDOWN_ITEM, danger && 'graph-editor-dropdown__item--danger');
}

function normalizeBtnTone(variant?: string): string {
    if (!variant) return 'neutral';
    const map: Record<string, string> = {
        light: 'light',
        danger: 'danger',
        neutral: 'neutral',
    };
    return map[variant] ?? variant.replace(/^outline-/, '');
}
