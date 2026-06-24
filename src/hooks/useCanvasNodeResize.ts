import { useCallback } from 'react';
import type { Node } from 'reactflow';

import { isNodeLocked, patchEditorHints, type EditorTree } from '@signalsafe/tree-spec-editor-core';

export type UseCanvasNodeResizeOptions = {
    readOnly: boolean;
    treeRef: React.MutableRefObject<EditorTree>;
    onChange: (next: EditorTree) => void;
    setNodes: (value: Node[] | ((nodes: Node[]) => Node[])) => void;
    isResizingRef: React.MutableRefObject<boolean>;
    resizeHeightByNodeId: Record<string, number>;
    setResizeHeightByNodeId: React.Dispatch<React.SetStateAction<Record<string, number>>>;
};

export type UseCanvasNodeResizeResult = {
    handleResizeNodeStart: (nodeId: string, width: number, height: number) => void;
    handleResizeNode: (nodeId: string, width: number, height: number) => void;
};

export function useCanvasNodeResize(options: UseCanvasNodeResizeOptions): UseCanvasNodeResizeResult {
    const {
        readOnly,
        treeRef,
        onChange,
        setNodes,
        isResizingRef,
        setResizeHeightByNodeId,
    } = options;

    const handleResizeNodeStart = useCallback(
        (nodeId: string, width: number, height: number) => {
            if (readOnly) return;
            isResizingRef.current = true;
            const lockedHeight = Math.round(height);
            setResizeHeightByNodeId((prev) => ({ ...prev, [nodeId]: lockedHeight }));
            setNodes((current) =>
                current.map((node) =>
                    node.id === nodeId
                        ? {
                              ...node,
                              style: {
                                  ...node.style,
                                  width: Math.round(width),
                                  height: lockedHeight,
                              },
                              data: {
                                  ...node.data,
                                  lockedResizeHeight: lockedHeight,
                              },
                          }
                        : node,
                ),
            );
        },
        [readOnly, setNodes, isResizingRef, setResizeHeightByNodeId],
    );

    const handleResizeNode = useCallback(
        (nodeId: string, width: number, height: number) => {
            const node = treeRef.current.nodes[nodeId];
            if (!node || isNodeLocked(node) || readOnly) return;
            isResizingRef.current = false;
            setResizeHeightByNodeId((prev) => {
                if (!(nodeId in prev)) return prev;
                const next = { ...prev };
                delete next[nodeId];
                return next;
            });
            onChange({
                ...treeRef.current,
                nodes: {
                    ...treeRef.current.nodes,
                    [nodeId]: patchEditorHints(node, {
                        width: Math.round(width),
                        height: Math.round(height),
                    }),
                },
            });
        },
        [onChange, readOnly, treeRef, isResizingRef, setResizeHeightByNodeId],
    );

    return {
        handleResizeNodeStart,
        handleResizeNode,
    };
}
