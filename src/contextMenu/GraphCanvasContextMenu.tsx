import { END_NODE_ID } from '@signalsafe/tree-spec-editor-core';

import { CONTEXT_MENU_CLASS } from '../canvas/constants';
import { joinClasses } from '../utils/joinClasses';
import type { CanvasContextMenuState } from './types';

export function GraphCanvasContextMenu({
    menu,
    readOnly,
    onClose,
    onDuplicateNode,
    onDeleteNode,
    onAutoLayout,
}: Readonly<{
    menu: CanvasContextMenuState | null;
    readOnly: boolean;
    onClose: () => void;
    onDuplicateNode?: (nodeId: string) => void;
    onDeleteNode?: (nodeId: string) => void;
    onAutoLayout?: () => void;
}>) {
    if (!menu || readOnly) return null;

    const items: Array<{ key: string; label: string; danger?: boolean; onClick: () => void }> = [];

    if (menu.kind === 'node' && menu.nodeId !== END_NODE_ID) {
        if (onDuplicateNode) {
            items.push({
                key: 'duplicate',
                label: 'Duplicate node',
                onClick: () => onDuplicateNode(menu.nodeId),
            });
        }
        if (onDeleteNode) {
            items.push({
                key: 'delete',
                label: 'Delete node',
                danger: true,
                onClick: () => onDeleteNode(menu.nodeId),
            });
        }
    } else if (menu.kind === 'pane' && onAutoLayout) {
        items.push({
            key: 'auto-layout',
            label: 'Auto layout',
            onClick: () => onAutoLayout(),
        });
    }

    if (items.length === 0) return null;

    return (
        <div
            className={CONTEXT_MENU_CLASS}
            style={{ left: menu.x, top: menu.y, zIndex: 1050 }}
            role="menu"
            tabIndex={-1}
            onContextMenu={(event) => event.preventDefault()}
            onPointerDown={(event) => event.stopPropagation()}
        >
            {items.map((item) => (
                <button
                    key={item.key}
                    type="button"
                    className={joinClasses('dropdown-item', item.danger && 'text-danger')}
                    role="menuitem"
                    onClick={() => {
                        item.onClick();
                        onClose();
                    }}
                >
                    {item.label}
                </button>
            ))}
        </div>
    );
}
