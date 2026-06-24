import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import type { Node } from 'reactflow';

import type { CanvasContextMenuState } from '../contextMenu/types';

export type UseCanvasContextMenuOptions = {
    readOnly: boolean;
    onAutoLayout?: () => void;
};

export type UseCanvasContextMenuResult = {
    contextMenu: CanvasContextMenuState | null;
    closeContextMenu: () => void;
    onNodeContextMenu: (event: MouseEvent, node: Node) => void;
    onPaneContextMenu: (event: MouseEvent) => void;
};

export function useCanvasContextMenu(options: UseCanvasContextMenuOptions): UseCanvasContextMenuResult {
    const { readOnly, onAutoLayout } = options;
    const [contextMenu, setContextMenu] = useState<CanvasContextMenuState | null>(null);

    const closeContextMenu = useCallback(() => setContextMenu(null), []);

    useEffect(() => {
        if (!contextMenu) return;
        if (typeof document === 'undefined') return;
        const onPointerDown = () => closeContextMenu();
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') closeContextMenu();
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [contextMenu, closeContextMenu]);

    const onNodeContextMenu = useCallback(
        (event: MouseEvent, node: Node) => {
            if (readOnly) return;
            event.preventDefault();
            setContextMenu({
                kind: 'node',
                nodeId: node.id,
                x: event.clientX,
                y: event.clientY,
            });
        },
        [readOnly],
    );

    const onPaneContextMenu = useCallback(
        (event: MouseEvent) => {
            if (readOnly || !onAutoLayout) return;
            event.preventDefault();
            setContextMenu({
                kind: 'pane',
                x: event.clientX,
                y: event.clientY,
            });
        },
        [readOnly, onAutoLayout],
    );

    return {
        contextMenu,
        closeContextMenu,
        onNodeContextMenu,
        onPaneContextMenu,
    };
}
