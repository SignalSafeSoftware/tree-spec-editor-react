import { useCallback, useRef, type MutableRefObject } from 'react';
import type { Connection, Edge } from 'reactflow';
import { useReactFlow } from 'reactflow';

import {
    GRAPH_SELECTION_KIND,
    applyEditorConnect,
    applyEditorConnectOnDrop,
    applyEditorReconnect,
    isValidEditorConnection,
    type EditorTree,
    type GraphSelection,
} from '@signalsafe/tree-spec-editor-core';

import { isReactFlowPaneTarget } from '../canvas/typeGuards';

export type UseGraphConnectOptions = {
    treeRef: MutableRefObject<EditorTree>;
    onChange: (next: EditorTree) => void;
    onSelect?: (sel: GraphSelection) => void;
    readOnly: boolean;
};

export type UseGraphConnectResult = {
    onConnect: (conn: Connection) => void;
    onConnectStart: (
        _event: unknown,
        params: { nodeId: string | null; handleId: string | null },
    ) => void;
    onConnectEnd: (event: MouseEvent | TouchEvent) => void;
    onReconnect: (oldEdge: Edge, newConnection: Connection) => void;
    onEdgesDelete: (deleted: Edge[]) => void;
    isValidConnection: (conn: Connection) => boolean;
};

export function useGraphConnect(options: UseGraphConnectOptions): UseGraphConnectResult {
    const { treeRef, onChange, onSelect, readOnly } = options;
    const rf = useReactFlow();

    const connectCompletedRef = useRef(false);
    const pendingConnectRef = useRef<{ source: string; sourceHandle: string | null } | null>(null);

    const onConnect = useCallback(
        (conn: Connection) => {
            connectCompletedRef.current = true;
            const nextTree = applyEditorConnect(treeRef.current, conn);
            if (!nextTree) return;
            onChange(nextTree);
        },
        [onChange, treeRef],
    );

    const onConnectStart = useCallback(
        (_event: unknown, params: { nodeId: string | null; handleId: string | null }) => {
            connectCompletedRef.current = false;
            if (!params.nodeId || !params.handleId) {
                pendingConnectRef.current = null;
                return;
            }
            pendingConnectRef.current = {
                source: params.nodeId,
                sourceHandle: params.handleId,
            };
        },
        [],
    );

    const onConnectEnd = useCallback(
        (event: MouseEvent | TouchEvent) => {
            if (readOnly || connectCompletedRef.current) {
                pendingConnectRef.current = null;
                return;
            }
            const pending = pendingConnectRef.current;
            pendingConnectRef.current = null;
            if (!pending) return;

            if (!isReactFlowPaneTarget(event.target)) {
                return;
            }

            const clientX = 'clientX' in event ? event.clientX : event.changedTouches?.[0]?.clientX;
            const clientY = 'clientY' in event ? event.clientY : event.changedTouches?.[0]?.clientY;
            if (clientX == null || clientY == null) return;

            const dropPosition = rf.screenToFlowPosition({ x: clientX, y: clientY });
            const result = applyEditorConnectOnDrop(
                treeRef.current,
                pending.source,
                pending.sourceHandle,
                dropPosition,
            );
            if (!result) return;

            onChange(result.nextTree);
            onSelect?.({ kind: GRAPH_SELECTION_KIND.NODE, id: result.nextNodeId });
        },
        [onChange, onSelect, readOnly, rf, treeRef],
    );

    const isValidConnection = useCallback(
        (conn: Connection) => isValidEditorConnection(treeRef.current, conn),
        [treeRef],
    );

    const onReconnect = useCallback(
        (oldEdge: Edge, newConnection: Connection) => {
            const nextTree = applyEditorReconnect(treeRef.current, oldEdge, newConnection);
            if (!nextTree) return;
            onChange(nextTree);
        },
        [onChange, treeRef],
    );

    const onEdgesDelete = useCallback(
        (deleted: Edge[]) => {
            const deletedIds = new Set(deleted.map((edge) => String(edge.id)));
            if (deletedIds.size === 0) return;
            onChange({
                ...treeRef.current,
                transitions: treeRef.current.transitions.filter((t) => !deletedIds.has(t.id)),
            });
        },
        [onChange, treeRef],
    );

    return {
        onConnect,
        onConnectStart,
        onConnectEnd,
        onReconnect,
        onEdgesDelete,
        isValidConnection,
    };
}
