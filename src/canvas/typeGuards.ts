import { CHOICE_ROW_SELECTOR, REACT_FLOW_PANE_CLASS } from './constants.js';

export function isChoiceRowClickTarget(target: EventTarget | null): boolean {
    if (target == null || typeof target !== 'object') return false;
    if (!('closest' in target) || typeof (target as Element).closest !== 'function') return false;
    return Boolean((target as Element).closest(CHOICE_ROW_SELECTOR));
}

export function isReactFlowPaneTarget(target: EventTarget | null): boolean {
    if (target == null || typeof target !== 'object') return false;
    if (!('classList' in target) || typeof (target as Element).classList?.contains !== 'function') {
        return false;
    }
    return (target as Element).classList.contains(REACT_FLOW_PANE_CLASS);
}
