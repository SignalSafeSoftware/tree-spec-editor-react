import { useCallback, useMemo, useRef, useState, type MouseEvent } from 'react';
import ReactFlow, {
    Background,
    ConnectionMode,
    Controls,
    MiniMap,
    ReactFlowProvider,
    useReactFlow,
    type Edge,
    type Node,
    type NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';

import {
    GRAPH_SELECTION_KIND,
    choiceIdFromHandle,
    resolveGraphViewport,
    LAYOUT_SNAP_GRID,
    type EditorTree,
    type GraphSelection,
    type GraphEditorIssue,
} from '@signalsafe/tree-spec-editor-core';

import {
    GraphEditorCanvasContext,
    type GraphEditorCanvasContextValue,
} from './GraphEditorCanvasContext';
import { buildEdgeMarker, getIssueEdgeStyle, resolveSelectedEdgeStroke } from './canvas/edgeStyle';
import { CANVAS_CLASS } from './canvas/constants';
import { EDITOR_CANVAS_ROOT } from './ui/editorClasses';
import { resolveCanvasFocusChoiceId } from './canvas/focusChoice';
import { isChoiceRowClickTarget } from './canvas/typeGuards';
import { GraphCanvasContextMenu } from './contextMenu/GraphCanvasContextMenu';
import { EndNode } from './nodes/EndNode';
import { PromptNode } from './nodes/PromptNode';
import { joinClasses } from './utils/joinClasses';
import { useCanvasContextMenu } from './hooks/useCanvasContextMenu';
import { useCanvasGraphState } from './hooks/useCanvasGraphState';
import { useCanvasIssueIndex } from './hooks/useCanvasIssueIndex';
import { useCanvasNodeResize } from './hooks/useCanvasNodeResize';
import { useCanvasViewport } from './hooks/useCanvasViewport';
import { useChoiceDragDrop } from './hooks/useChoiceDragDrop';
import { useGraphConnect } from './hooks/useGraphConnect';

export type TreeSpecGraphEditorProps = {
    tree: EditorTree;
    onChange: (next: EditorTree) => void;
    issues?: GraphEditorIssue[];
    showMiniMap?: boolean;
    selected?: GraphSelection;
    onSelect?: (sel: GraphSelection) => void;
    /** Called when a choice row is clicked on the canvas (after `onSelect` for the parent node). */
    onChoiceSelect?: (nodeId: string, choiceId: string) => void;
    /** Called when a choice is dropped after drag (reorder or move to another node). */
    onRepositionChoice?: (
        fromNodeId: string,
        choiceId: string,
        toNodeId: string,
        toIndex: number,
    ) => void;
    focusNodeId?: string | null;
    /** Focused choice on the currently selected node (canvas + inspector sync). */
    focusChoiceId?: string | null;
    fitViewNonce?: number;
    /** Optional class for the outer container (default: `graph-editor-canvas-root`). */
    className?: string;
    /** When true, disables canvas editing affordances (toolbar, resize, context menu). */
    readOnly?: boolean;
    /** Duplicate a prompt node from the canvas toolbar or context menu. */
    onDuplicateNode?: (nodeId: string) => void;
    /** Delete a prompt node from the canvas toolbar or context menu. */
    onDeleteNode?: (nodeId: string) => void;
    /** Run auto-layout from the pane context menu. */
    onAutoLayout?: () => void;
    /**
     * When true (default), zooms the viewport to fit the current node/edge selection.
     * Skipped when `focusNodeId` already targets the same node.
     */
    contextualZoom?: boolean;
    /** Canvas chrome mode — host theme hint (`light` / `dark`). */
    colorMode?: 'light' | 'dark';
};

function TreeSpecGraphInner({
    tree,
    onChange,
    issues = [],
    selected,
    onSelect,
    onChoiceSelect,
    onRepositionChoice,
    focusNodeId,
    focusChoiceId = null,
    showMiniMap = true,
    fitViewNonce,
    className = EDITOR_CANVAS_ROOT,
    readOnly = false,
    onDuplicateNode,
    onDeleteNode,
    onAutoLayout,
    contextualZoom = true,
    colorMode = 'light',
}: Readonly<TreeSpecGraphEditorProps>) {
    const rf = useReactFlow();
    const treeRef = useRef(tree);
    treeRef.current = tree;
    const suppressViewportSaveRef = useRef(true);
    const isResizingRef = useRef(false);

    const { issuesByNode, issueKeySet } = useCanvasIssueIndex(issues);

    const {
        choiceDrag,
        choiceDropTarget,
        handleChoiceDragStart,
        handleChoiceDragEnd,
        handleChoiceDragOver,
        handleChoiceDrop,
    } = useChoiceDragDrop({
        readOnly,
        onChoiceSelect,
        onSelect,
        onRepositionChoice,
    });

    const { contextMenu, closeContextMenu, onNodeContextMenu, onPaneContextMenu } = useCanvasContextMenu({
        readOnly,
        onAutoLayout,
    });

    const [resizeHeightByNodeId, setResizeHeightByNodeId] = useState<Record<string, number>>({});

    const graphState = useCanvasGraphState({
        tree,
        onChange,
        issues,
        issuesByNode,
        readOnly,
        resizeHeightByNodeId,
        isResizingRef,
        suppressViewportSaveRef,
    });

    const {
        nodes,
        edges,
        onNodesChangeWrapped,
        onEdgesChangeWrapped,
        onNodeDragStart,
        onNodeDragStop,
        onMoveEnd,
        setNodes,
    } = graphState;

    const resizeHandlers = useCanvasNodeResize({
        readOnly,
        treeRef,
        onChange,
        setNodes,
        isResizingRef,
        resizeHeightByNodeId,
        setResizeHeightByNodeId,
    });

    useCanvasViewport({
        rf,
        focusNodeId,
        fitViewNonce,
        contextualZoom,
        selected,
        suppressViewportSaveRef,
    });

    const {
        onConnect,
        onConnectStart,
        onConnectEnd,
        onReconnect,
        onEdgesDelete,
        isValidConnection,
    } = useGraphConnect({
        treeRef,
        onChange,
        onSelect,
        readOnly,
    });

    const savedViewport = useMemo(() => resolveGraphViewport(tree), [tree._meta]);

    const nodeTypes: NodeTypes = useMemo(
        () => ({
            promptNode: PromptNode,
            endNode: EndNode,
        }),
        [],
    );

    const onNodeClick = useCallback(
        (evt: MouseEvent, node: Node) => {
            if (isChoiceRowClickTarget(evt.target)) return;
            onSelect?.({ kind: GRAPH_SELECTION_KIND.NODE, id: node.id });
        },
        [onSelect],
    );

    const onEdgeClick = useCallback(
        (_evt: unknown, edge: Edge) => {
            onSelect?.({ kind: GRAPH_SELECTION_KIND.EDGE, id: edge.id });
        },
        [onSelect],
    );

    const onPaneClick = useCallback(() => {
        onSelect?.({ kind: null, id: null });
    }, [onSelect]);

    const canvasContextValue = useMemo<GraphEditorCanvasContextValue>(
        () => ({
            readOnly,
            onDuplicateNode: (nodeId) => onDuplicateNode?.(nodeId),
            onDeleteNode: (nodeId) => onDeleteNode?.(nodeId),
            onResizeNode: resizeHandlers.handleResizeNode,
            onResizeNodeStart: resizeHandlers.handleResizeNodeStart,
            onSelectChoice: (nodeId, choiceId) => {
                if (onChoiceSelect) {
                    onChoiceSelect(nodeId, choiceId);
                    return;
                }
                onSelect?.({ kind: GRAPH_SELECTION_KIND.NODE, id: nodeId });
            },
            choiceDrag,
            choiceDropTarget,
            onChoiceDragStart: handleChoiceDragStart,
            onChoiceDragEnd: handleChoiceDragEnd,
            onChoiceDragOver: handleChoiceDragOver,
            onChoiceDrop: handleChoiceDrop,
        }),
        [
            readOnly,
            onDuplicateNode,
            onDeleteNode,
            resizeHandlers.handleResizeNode,
            resizeHandlers.handleResizeNodeStart,
            onSelect,
            onChoiceSelect,
            choiceDrag,
            choiceDropTarget,
            handleChoiceDragStart,
            handleChoiceDragEnd,
            handleChoiceDragOver,
            handleChoiceDrop,
        ],
    );

    return (
        <GraphEditorCanvasContext.Provider value={canvasContextValue}>
            <div
                className={joinClasses(className, CANVAS_CLASS)}
                data-color-mode={colorMode}
            >
                <GraphCanvasContextMenu
                    menu={contextMenu}
                    readOnly={readOnly}
                    onClose={closeContextMenu}
                    onDuplicateNode={onDuplicateNode}
                    onDeleteNode={onDeleteNode}
                    onAutoLayout={onAutoLayout}
                />
                <ReactFlow
                    defaultViewport={savedViewport}
                    elementsSelectable={false}
                    selectNodesOnDrag={false}
                    nodes={nodes.map((n) => ({
                        ...n,
                        selected: selected?.kind === GRAPH_SELECTION_KIND.NODE && selected.id === n.id,
                        data:
                            n.type === 'promptNode'
                                ? {
                                      ...n.data,
                                      focusChoiceId: resolveCanvasFocusChoiceId(
                                          n.id,
                                          selected,
                                          focusNodeId,
                                          focusChoiceId,
                                      ),
                                  }
                                : n.data,
                    }))}
                    edges={edges.map((e) => {
                        const fromChoiceId = choiceIdFromHandle(e.sourceHandle);
                        const hasIssue = fromChoiceId ? issueKeySet.has(`${e.source}::${fromChoiceId}`) : false;
                        const isEdgeSelected =
                            selected?.kind === GRAPH_SELECTION_KIND.EDGE && selected.id === e.id;
                        let style = getIssueEdgeStyle(e.style, hasIssue);
                        const { style: resolvedStyle, stroke } = resolveSelectedEdgeStroke(style, isEdgeSelected);
                        style = resolvedStyle;
                        return {
                            ...e,
                            selected: isEdgeSelected,
                            style,
                            markerEnd: buildEdgeMarker(stroke),
                        };
                    })}
                    onNodesChange={onNodesChangeWrapped}
                    onEdgesChange={onEdgesChangeWrapped}
                    onConnect={onConnect}
                    onConnectStart={onConnectStart}
                    onConnectEnd={onConnectEnd}
                    onReconnect={onReconnect}
                    onEdgesDelete={onEdgesDelete}
                    isValidConnection={isValidConnection}
                    connectionMode={ConnectionMode.Strict}
                    snapToGrid
                    snapGrid={[LAYOUT_SNAP_GRID, LAYOUT_SNAP_GRID]}
                    onNodeDragStart={onNodeDragStart}
                    onNodeDragStop={onNodeDragStop}
                    onNodeClick={onNodeClick}
                    onEdgeClick={onEdgeClick}
                    onPaneClick={onPaneClick}
                    onNodeContextMenu={onNodeContextMenu}
                    onPaneContextMenu={onPaneContextMenu}
                    onMoveEnd={onMoveEnd}
                    nodeTypes={nodeTypes}
                >
                    {showMiniMap ? <MiniMap pannable ariaLabel="Canvas overview — drag to pan" /> : null}
                    <Controls />
                    <Background />
                </ReactFlow>
            </div>
        </GraphEditorCanvasContext.Provider>
    );
}

export default function TreeSpecGraphEditor(props: Readonly<TreeSpecGraphEditorProps>) {
    return (
        <ReactFlowProvider>
            <TreeSpecGraphInner {...props} />
        </ReactFlowProvider>
    );
}
