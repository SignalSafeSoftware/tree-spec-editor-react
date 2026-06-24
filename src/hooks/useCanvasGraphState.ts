import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
    useEdgesState,
    useNodesState,
    type Edge,
    type Node,
    type OnEdgesChange,
    type OnNodesChange,
    type Viewport,
} from 'reactflow';

import {
    END_NODE_ID,
    getEditorHints,
    isNodeLocked,
    patchGraphEditorMeta,
    resolveCanvasNodeWidth,
    resolveEndNodePosition,
    snapPosition,
    type EditorNode,
    type EditorTree,
    type GraphEditorIssue,
    type ReactFlowEdgeChange,
    type ReactFlowNodeChange,
} from '@signalsafe/tree-spec-editor-core';

import { buildEdgesFromTransitions, buildTransitionsFromEdges } from '../canvas/edgeBuilders';
import { NODE_DRAG_HANDLE_SELECTOR } from '../canvas/constants';
import type { PromptNodeData } from '../nodes/types';

export type UseCanvasGraphStateOptions = {
    tree: EditorTree;
    onChange: (next: EditorTree) => void;
    issues: GraphEditorIssue[];
    issuesByNode: Map<string, { total: number; errors: number; warnings: number; info: number }>;
    readOnly: boolean;
    resizeHeightByNodeId: Record<string, number>;
    isResizingRef: React.MutableRefObject<boolean>;
    suppressViewportSaveRef: React.MutableRefObject<boolean>;
};

export type UseCanvasGraphStateResult = {
    nodes: Node[];
    edges: Edge[];
    onNodesChangeWrapped: OnNodesChange;
    onEdgesChangeWrapped: OnEdgesChange;
    onNodeDragStart: () => void;
    onNodeDragStop: () => void;
    onMoveEnd: (event: MouseEvent | TouchEvent, viewport: Viewport) => void;
    setNodes: (value: Node[] | ((nodes: Node[]) => Node[])) => void;
};

export function useCanvasGraphState(options: UseCanvasGraphStateOptions): UseCanvasGraphStateResult {
    const {
        tree,
        onChange,
        issues,
        issuesByNode,
        readOnly,
        resizeHeightByNodeId,
        isResizingRef,
        suppressViewportSaveRef,
    } = options;

    const isDraggingRef = useRef(false);
    const nodesRef = useRef<Node[]>([]);
    const edgesRef = useRef<Edge[]>([]);
    const treeRef = useRef(tree);
    treeRef.current = tree;

    const endNodePosition = useMemo(() => resolveEndNodePosition(tree), [tree._meta, tree.nodes]);

    useEffect(() => {
        suppressViewportSaveRef.current = true;
        const id = globalThis.setTimeout(() => {
            suppressViewportSaveRef.current = false;
        }, 0);
        return () => globalThis.clearTimeout(id);
    }, [tree._meta, suppressViewportSaveRef]);

    const initialNodes: Node[] = useMemo(() => {
        const arr: Node[] = [];
        for (const n of Object.values(tree.nodes)) {
            const editor = getEditorHints(n);
            const locked = isNodeLocked(n);
            const nodeWidth = resolveCanvasNodeWidth(editor);
            const nodeHeight = editor.height ?? resizeHeightByNodeId[n.id];
            arr.push({
                id: n.id,
                type: 'promptNode',
                position: n.position ?? { x: 0, y: 0 },
                draggable: !locked,
                dragHandle: locked || readOnly ? undefined : NODE_DRAG_HANDLE_SELECTOR,
                style: {
                    width: nodeWidth,
                    ...(nodeHeight === undefined ? {} : { height: nodeHeight }),
                },
                data: {
                    node: n,
                    isStart: tree.start_node === n.id,
                    issuesTotal: issuesByNode.get(n.id)?.total ?? 0,
                    issuesErrors: issuesByNode.get(n.id)?.errors ?? 0,
                    issuesWarnings: issuesByNode.get(n.id)?.warnings ?? 0,
                    issuesInfo: issuesByNode.get(n.id)?.info ?? 0,
                    lockedResizeHeight: resizeHeightByNodeId[n.id],
                } satisfies PromptNodeData,
            });
        }
        arr.push({
            id: END_NODE_ID,
            type: 'endNode',
            position: endNodePosition,
            data: {},
            selectable: true,
            draggable: true,
        });
        return arr;
    }, [tree.nodes, tree.start_node, endNodePosition, issuesByNode, readOnly, resizeHeightByNodeId]);

    const initialEdges: Edge[] = useMemo(() => buildEdgesFromTransitions(tree), [tree]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    useEffect(() => {
        nodesRef.current = nodes;
    }, [nodes]);
    useEffect(() => {
        edgesRef.current = edges;
    }, [edges]);

    const lastTreeRef = useRef<string>('');
    useEffect(() => {
        const nextKey = JSON.stringify({ tree, issues: issues.length });
        if (nextKey === lastTreeRef.current) return;
        if (isResizingRef.current) return;
        lastTreeRef.current = nextKey;
        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [tree, issues.length, initialNodes, initialEdges, setNodes, setEdges, isResizingRef]);

    const commit = useCallback(
        (nextNodes: Node[], nextEdges: Edge[]) => {
            if (isDraggingRef.current) return;

            const updatedNodes: Record<string, EditorNode> = { ...tree.nodes };
            for (const n of nextNodes) {
                if (n.id === END_NODE_ID) continue;
                const existing = updatedNodes[n.id];
                if (!existing) continue;
                if (isNodeLocked(existing)) continue;
                updatedNodes[n.id] = {
                    ...existing,
                    position: snapPosition({ x: n.position.x, y: n.position.y }),
                };
            }
            const transitions = buildTransitionsFromEdges(nextEdges, tree.transitions);

            const endNode = nextNodes.find((n) => n.id === END_NODE_ID);
            let nextTree = {
                ...tree,
                nodes: updatedNodes,
                transitions,
            };
            if (endNode) {
                nextTree = patchGraphEditorMeta(nextTree, {
                    end_position: { x: endNode.position.x, y: endNode.position.y },
                });
            }

            onChange(nextTree);
        },
        [tree, onChange],
    );

    const onMoveEnd = useCallback(
        (_event: MouseEvent | TouchEvent, viewport: Viewport) => {
            if (suppressViewportSaveRef.current) return;
            onChange(patchGraphEditorMeta(tree, { viewport }));
        },
        [tree, onChange, suppressViewportSaveRef],
    );

    const onNodesChangeWrapped = useCallback<OnNodesChange>(
        (changes) => {
            onNodesChange(changes);
            const shouldCommit = changes.some((c: ReactFlowNodeChange) => {
                if (c?.type === 'select' || c?.type === 'dimensions') return false;
                if (c?.type === 'position' && c?.dragging) return false;
                return true;
            });
            if (shouldCommit) queueMicrotask(() => commit(nodesRef.current, edgesRef.current));
        },
        [onNodesChange, commit],
    );

    const onEdgesChangeWrapped = useCallback<OnEdgesChange>(
        (changes) => {
            onEdgesChange(changes);
            const shouldCommit = changes.some((c: ReactFlowEdgeChange) => c?.type !== 'select');
            if (shouldCommit) queueMicrotask(() => commit(nodesRef.current, edgesRef.current));
        },
        [onEdgesChange, commit],
    );

    const onNodeDragStart = useCallback(() => {
        isDraggingRef.current = true;
    }, []);

    const onNodeDragStop = useCallback(() => {
        isDraggingRef.current = false;
        commit(nodesRef.current, edgesRef.current);
    }, [commit]);

    return {
        nodes,
        edges,
        onNodesChangeWrapped,
        onEdgesChangeWrapped,
        onNodeDragStart,
        onNodeDragStop,
        onMoveEnd,
        setNodes,
    };
}
