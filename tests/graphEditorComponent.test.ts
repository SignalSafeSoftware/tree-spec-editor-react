import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestRenderer, act } from './reactTestRenderer';
import TreeSpecGraphEditor from '../src/TreeSpecGraphEditor';
import { END_NODE_ID, DEFAULT_GRAPH_NODE_WIDTH, GRAPH_SELECTION_KIND, type EditorTree, type GraphEditorIssue } from '@signalsafe/tree-spec-editor-core';
import {
    CANVAS_NODE_SELECTED_CLASS,
    CHOICE_DRAG_HANDLE_CLASS,
    CHOICE_DROP_APPEND_CLASS,
    CHOICE_DROP_TARGET_CLASS,
} from '../src/canvas/constants';

const reactFlowState = {
    latestProps: null as any,
    getNode: vi.fn(),
    setCenter: vi.fn(),
    fitView: vi.fn(),
    screenToFlowPosition: vi.fn(({ x, y }: { x: number; y: number }) => ({ x: x - 140, y: y - 70 })),
    setNodes: null as null | ((value: any) => void),
    setEdges: null as null | ((value: any) => void),
    initialNodesTransform: null as null | ((nodes: any[]) => any[]),
    initialEdgesTransform: null as null | ((edges: any[]) => any[]),
};

function applyNodeChanges(nodes: any[], changes: any[]) {
    let next = [...nodes];
    for (const change of changes) {
        if (change?.type === 'remove') {
            next = next.filter((node) => node.id !== change.id);
            continue;
        }
        if (change?.type === 'position') {
            next = next.map((node) =>
                node.id === change.id && change.position
                    ? { ...node, position: change.position }
                    : node
            );
            continue;
        }
        if (change?.type === 'select') {
            next = next.map((node) =>
                node.id === change.id ? { ...node, selected: Boolean(change.selected) } : node
            );
        }
    }
    return next;
}

function applyEdgeChanges(edges: any[], changes: any[]) {
    let next = [...edges];
    for (const change of changes) {
        if (change?.type === 'remove') {
            next = next.filter((edge) => edge.id !== change.id);
            continue;
        }
        if (change?.type === 'select') {
            next = next.map((edge) =>
                edge.id === change.id ? { ...edge, selected: Boolean(change.selected) } : edge
            );
        }
    }
    return next;
}

vi.mock('reactflow', () => {
    function MockReactFlow(props: any) {
        reactFlowState.latestProps = props;
        return React.createElement(
            'div',
            { 'data-testid': 'reactflow' },
            [
                React.createElement('button', {
                    key: 'pane',
                    type: 'button',
                    'data-testid': 'pane',
                    onClick: () => props.onPaneClick?.(),
                }),
                ...(props.nodes ?? []).map((node: any) => {
                    const NodeType = props.nodeTypes?.[node.type];
                    return React.createElement(
                        'button',
                        {
                            key: `node-${node.id}`,
                            type: 'button',
                            'data-testid': `node-${node.id}`,
                            'data-selected': String(Boolean(node.selected)),
                            onClick: (event?: { target?: unknown }) =>
                                props.onNodeClick?.({ target: event?.target ?? null }, node),
                        },
                        NodeType ? React.createElement(NodeType, { data: node.data, id: node.id, selected: node.selected }) : node.id
                    );
                }),
                ...(props.edges ?? []).map((edge: any) =>
                    React.createElement(
                        'button',
                        {
                            key: `edge-${edge.id}`,
                            type: 'button',
                            'data-testid': `edge-${edge.id}`,
                            'data-selected': String(Boolean(edge.selected)),
                            'data-stroke-dasharray': String(edge.style?.strokeDasharray ?? ''),
                            onClick: () => props.onEdgeClick?.({}, edge),
                        },
                        String(edge.label ?? '')
                    )
                ),
                props.children,
            ]
        );
    }

    return {
        default: MockReactFlow,
        Background: () => React.createElement('div', { 'data-testid': 'background' }),
        Controls: () => React.createElement('div', { 'data-testid': 'controls' }),
        Handle: (props: any) =>
            React.createElement('span', {
                'data-testid': `handle-${props.type}-${props.id ?? 'default'}`,
            }),
        MiniMap: (props: { pannable?: boolean; ariaLabel?: string }) =>
            React.createElement('div', {
                'data-testid': 'minimap',
                'data-pannable': String(Boolean(props.pannable)),
                'aria-label': props.ariaLabel,
            }),
        Position: { Left: 'left', Right: 'right' },
        ConnectionMode: { Strict: 'strict', Loose: 'loose' },
        MarkerType: { ArrowClosed: 'arrowclosed' },
        NodeToolbar: ({ children }: { children?: React.ReactNode }) =>
            React.createElement('div', { 'data-testid': 'node-toolbar' }, children),
        NodeResizer: (props: {
            onResize?: () => void;
            onResizeStart?: (event: unknown, params: { width: number; height: number }) => void;
            onResizeEnd?: (event: unknown, params: { width: number; height: number }) => void;
        }) =>
            React.createElement('button', {
                type: 'button',
                'data-testid': 'node-resizer',
                onClick: () => {
                    props.onResizeStart?.({}, { width: 300, height: 150 });
                    props.onResize?.();
                    props.onResizeEnd?.({}, { width: 320, height: 160 });
                },
            }),
        ReactFlowProvider: ({ children }: { children: React.ReactNode }) =>
            React.createElement('div', { 'data-testid': 'provider' }, children),
        addEdge: (edge: any, edges: any[]) => [...edges, edge],
        useNodesState: (initial: any[]) => {
            const [nodes, setNodes] = React.useState(() =>
                reactFlowState.initialNodesTransform ? reactFlowState.initialNodesTransform(initial) : initial
            );
            reactFlowState.setNodes = setNodes;
            const onNodesChange = (changes: any[]) => {
                setNodes((prev) => applyNodeChanges(prev, changes));
            };
            return [nodes, setNodes, onNodesChange];
        },
        useEdgesState: (initial: any[]) => {
            const [edges, setEdges] = React.useState(() =>
                reactFlowState.initialEdgesTransform ? reactFlowState.initialEdgesTransform(initial) : initial
            );
            reactFlowState.setEdges = setEdges;
            const onEdgesChange = (changes: any[]) => {
                setEdges((prev) => applyEdgeChanges(prev, changes));
            };
            return [edges, setEdges, onEdgesChange];
        },
        useReactFlow: () => ({
            getNode: reactFlowState.getNode,
            setCenter: reactFlowState.setCenter,
            fitView: reactFlowState.fitView,
            screenToFlowPosition: reactFlowState.screenToFlowPosition,
        }),
        useUpdateNodeInternals: () => vi.fn(),
    };
});

function createTree(): EditorTree {
    return {
        start_node: 'start',
        nodes: {
            start: {
                id: 'start',
                type: 'prompt',
                prompt: 'Review the message',
                choices: [
                    { id: 'c1', label: 'Investigate' },
                    { id: 'c2', label: 'Escalate' },
                ],
                position: { x: 10, y: 20 },
            },
            review: {
                id: 'review',
                type: 'info',
                prompt: '',
                choices: [],
                position: { x: 200, y: 50 },
            },
        },
        transitions: [
            { id: 't1', fromNodeId: 'start', fromChoiceId: 'c1', toNodeId: 'review' },
            { id: 't2', fromNodeId: 'start', fromChoiceId: 'c2', toNodeId: END_NODE_ID, outcome: 'safe' },
        ],
    };
}

function createIssues(): GraphEditorIssue[] {
    return [
        { severity: 'error', message: 'Bad transition', node_id: 'start', choice_id: 'c1' },
        { severity: 'warning', message: 'Needs review', node_id: 'start', choice_id: 'c2' },
        { severity: 'info', message: 'FYI', node_id: 'review' },
    ];
}

async function flushMicrotasks() {
    await act(async () => {
        await Promise.resolve();
    });
}

let renderer: TestRenderer.ReactTestRenderer | null = null;

beforeEach(() => {
    reactFlowState.latestProps = null;
    reactFlowState.getNode.mockReset();
    reactFlowState.setCenter.mockReset();
    reactFlowState.fitView.mockReset();
    reactFlowState.setNodes = null;
    reactFlowState.setEdges = null;
    reactFlowState.initialNodesTransform = null;
    reactFlowState.initialEdgesTransform = null;
});

afterEach(() => {
    renderer?.unmount();
    renderer = null;
    vi.useRealTimers();
});

describe('TreeSpecGraphEditor', () => {
    it('renders node cards, END, badges, and selected edges', async () => {
        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree: createTree(),
                    issues: createIssues(),
                    onChange: vi.fn(),
                    selected: { kind: 'edge', id: 't2' },
                })
            );
        });

        const root = renderer!.root;
        expect(root.findByProps({ 'data-testid': 'provider' })).toBeTruthy();
        expect(root.findByProps({ 'data-testid': 'reactflow' })).toBeTruthy();
        expect(root.findByProps({ 'data-testid': 'minimap' })).toBeTruthy();
        expect(root.findByProps({ 'data-testid': 'minimap' }).props['data-pannable']).toBe('true');
        expect(root.findByProps({ title: '1 errors, 1 warnings, 0 info' })).toBeTruthy();
        expect(root.findByProps({ title: '0 errors, 0 warnings, 1 info' })).toBeTruthy();
        expect(root.findByProps({ 'data-testid': 'edge-t1' }).props['data-stroke-dasharray']).toBe('6 4');
        expect(root.findByProps({ 'data-testid': 'edge-t2' }).props['data-selected']).toBe('true');
        expect(root.findAll((node) => node.type === 'em' && node.children.includes('(empty prompt)'))).toHaveLength(1);
        expect(root.findAll((node) => node.type === 'em' && node.children.includes('No choices'))).toHaveLength(1);
        expect(root.findAll((node) => node.type === 'div' && node.children.includes('END')).length).toBeGreaterThan(0);
    });

    it('renders warning-only nodes with the warning border class', async () => {
        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree: createTree(),
                    issues: [{ severity: 'warning', message: 'Needs review', node_id: 'start', choice_id: 'c2' }],
                    onChange: vi.fn(),
                })
            );
        });

        const warningCards = renderer!.root.findAll(
            (node) =>
                node.type === 'div' &&
                typeof node.props.className === 'string' &&
                node.props.className.includes('border-warning')
        );

        expect(warningCards.length).toBeGreaterThan(0);
    });

    it('highlights a focused choice instead of the whole node card', async () => {
        const tree = createTree();
        const onChoiceSelect = vi.fn();

        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree,
                    onChange: vi.fn(),
                    selected: { kind: 'node', id: 'start' },
                    focusChoiceId: 'c2',
                    onChoiceSelect,
                }),
            );
        });

        const nodeCard = renderer!.root.findAll(
            (node) =>
                node.type === 'div' &&
                typeof node.props.className === 'string' &&
                node.props.className.includes('graph-editor-canvas-node') &&
                node.props.className.includes('bg-primary-subtle'),
        );
        expect(nodeCard).toHaveLength(0);

        const focusedChoice = renderer!.root.findAll(
            (node) =>
                node.type === 'div' &&
                typeof node.props.className === 'string' &&
                node.props.className.includes('graph-editor-canvas-choice-selected') &&
                node.props.className.includes('bg-primary-subtle'),
        );
        expect(focusedChoice).toHaveLength(1);

        const choiceButtons = focusedChoice[0].findAllByType('button');
        const selectButton = choiceButtons.find(
            (btn: { props: { className?: string } }) =>
                typeof btn.props.className === 'string' &&
                btn.props.className.includes('graph-editor-choice-row-selectable'),
        );
        expect(selectButton).toBeDefined();

        await act(async () => {
            selectButton!.props.onClick({ stopPropagation: vi.fn() });
        });
        expect(onChoiceSelect).toHaveBeenCalledWith('start', 'c2');
    });

    it('does not call onSelect when a choice row is clicked and onChoiceSelect is provided', async () => {
        const onSelect = vi.fn();
        const onChoiceSelect = vi.fn();

        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree: createTree(),
                    onChange: vi.fn(),
                    selected: { kind: 'node', id: 'start' },
                    onSelect,
                    onChoiceSelect,
                }),
            );
        });

        const choiceButton = renderer!.root.findAll(
            (node) =>
                node.type === 'button' &&
                typeof node.props.className === 'string' &&
                node.props.className.includes('graph-editor-choice-row-selectable'),
        );
        expect(choiceButton.length).toBeGreaterThan(0);

        onSelect.mockClear();
        const choiceTarget = {
            closest: (selector: string) => (selector === '.graph-editor-choice-row' ? choiceTarget : null),
        };
        await act(async () => {
            choiceButton[0].props.onClick({ stopPropagation: vi.fn(), target: choiceTarget });
            reactFlowState.latestProps.onNodeClick?.({ target: choiceTarget }, { id: 'start' });
        });

        expect(onChoiceSelect).toHaveBeenCalled();
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('handles missing optional graph data branches', async () => {
        const tree = createTree();
        tree.nodes.start = {
            ...tree.nodes.start,
            position: undefined,
        } as unknown as EditorTree['nodes'][string];
        tree.nodes.review = {
            ...tree.nodes.review,
            choices: undefined,
        } as unknown as EditorTree['nodes'][string];
        tree.transitions = [
            {
                id: 'edge-without-choice',
                fromNodeId: 'missing-node',
                fromChoiceId: 'fallback-choice',
                toNodeId: END_NODE_ID,
            } as unknown as EditorTree['transitions'][number],
        ];

        reactFlowState.initialEdgesTransform = (edges) =>
            edges.map((edge) => ({
                ...edge,
                sourceHandle: undefined,
                style: { stroke: 'blue' },
            }));

        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree,
                    issues: [
                        { severity: 'warning', message: 'Missing node id' },
                        { severity: 'warning', message: 'Missing choice id', node_id: 'start' },
                    ] as GraphEditorIssue[],
                    onChange: vi.fn(),
                    selected: { kind: 'node', id: 'start' },
                })
            );
        });

        const root = renderer!.root;
        expect(root.findByProps({ 'data-testid': 'node-start' }).props['data-selected']).toBe('true');
        expect(root.findByProps({ 'data-testid': 'edge-edge-without-choice' }).props['data-stroke-dasharray']).toBe('');
        expect(root.findAll((node) => node.type === 'em' && node.children.includes('No choices'))).toHaveLength(1);
        expect(root.findByProps({ 'data-testid': 'edge-edge-without-choice' }).children.join('')).toContain(
            'fallback-choice  →  END (at_risk)'
        );
    });

    it('constrains default node width to 280px and wraps long prompt text', async () => {
        const longPrompt =
            'Account Recovery: SIM Swap Warning — You are prompted to reset a password urgently. What should you check first?';
        const tree = createTree();
        tree.nodes.start = {
            ...tree.nodes.start,
            prompt: longPrompt,
            choices: [
                {
                    id: 'c1',
                    label: 'Go through the official portal (typed URL) instead of clicking email links',
                },
                { id: 'c2', label: 'Escalate' },
            ],
        };

        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree,
                    onChange: vi.fn(),
                }),
            );
        });

        const startNode = reactFlowState.latestProps.nodes.find((n: { id: string }) => n.id === 'start');
        expect(startNode?.style?.width).toBe(DEFAULT_GRAPH_NODE_WIDTH);

        const promptCards = renderer!.root.findAll(
            (node) =>
                node.type === 'div' &&
                typeof node.props.className === 'string' &&
                node.props.className.includes('graph-editor-node-text-wrap') &&
                node.children?.includes(longPrompt),
        );
        expect(promptCards).toHaveLength(1);

        const card = renderer!.root.findAll(
            (node) =>
                node.type === 'div' &&
                typeof node.props.className === 'string' &&
                node.props.className.includes('graph-editor-canvas-node') &&
                node.props.style?.width === '100%',
        );
        expect(card.length).toBeGreaterThan(0);
    });

    it('applies text-truncate when textWrap is truncate', async () => {
        const longPrompt = 'This is a very long prompt that should be truncated with an ellipsis on the canvas';
        const tree = createTree();
        tree.nodes.start = {
            ...tree.nodes.start,
            prompt: longPrompt,
            render_hints: { editor: { textWrap: 'truncate' } },
        };

        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree,
                    onChange: vi.fn(),
                }),
            );
        });

        const truncatedPrompt = renderer!.root.findAll(
            (node) =>
                node.type === 'div' &&
                typeof node.props.className === 'string' &&
                node.props.className.includes('graph-editor-node-text-truncate') &&
                node.children?.includes(longPrompt),
        );
        expect(truncatedPrompt).toHaveLength(1);
    });

    it('restores END position and viewport from _meta.graph_editor', async () => {
        const tree = createTree();
        tree._meta = {
            graph_editor: {
                end_position: { x: 1200, y: 300 },
                viewport: { x: -50, y: 25, zoom: 0.75 },
            },
        };

        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree,
                    onChange: vi.fn(),
                }),
            );
        });

        const endNode = reactFlowState.latestProps.nodes.find((n: { id: string }) => n.id === END_NODE_ID);
        expect(endNode?.position).toEqual({ x: 1200, y: 300 });
        expect(reactFlowState.latestProps.defaultViewport).toEqual({ x: -50, y: 25, zoom: 0.75 });
    });

    it('applies a highlight background class to the selected node card', async () => {
        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree: createTree(),
                    issues: [],
                    onChange: vi.fn(),
                    selected: { kind: 'node', id: 'review' },
                }),
            );
        });

        const startBtn = renderer!.root.findByProps({ 'data-testid': 'node-review' });
        const highlighted = startBtn.findAll(
            (n) =>
                n.type === 'div' &&
                typeof n.props.className === 'string' &&
                n.props.className.includes('bg-primary-subtle'),
        );
        expect(highlighted.length).toBeGreaterThan(0);
    });

    it('merges issue styling into existing edge styles', async () => {
        reactFlowState.initialEdgesTransform = (edges) =>
            edges.map((edge) =>
                edge.id === 't1'
                    ? {
                          ...edge,
                          style: { stroke: 'blue' },
                      }
                    : edge
            );

        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree: createTree(),
                    issues: createIssues(),
                    onChange: vi.fn(),
                })
            );
        });

        expect(renderer!.root.findByProps({ 'data-testid': 'edge-t1' }).props['data-stroke-dasharray']).toBe('6 4');
    });

    it('supports node and edge selection callbacks and optional minimap hiding', async () => {
        const onSelect = vi.fn();
        const issues = createIssues();
        issues.push({ message: 'No severity provided', node_id: 'start' } as GraphEditorIssue);

        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree: createTree(),
                    issues,
                    onChange: vi.fn(),
                    onSelect,
                    showMiniMap: false,
                })
            );
        });

        const root = renderer!.root;
        expect(root.findAllByProps({ 'data-testid': 'minimap' })).toHaveLength(0);

        await act(async () => {
            root.findByProps({ 'data-testid': 'node-start' }).props.onClick();
            root.findByProps({ 'data-testid': 'edge-t1' }).props.onClick();
        });

        expect(onSelect).toHaveBeenNthCalledWith(1, { kind: 'node', id: 'start' });
        expect(onSelect).toHaveBeenNthCalledWith(2, { kind: 'edge', id: 't1' });
    });

    it('clears selection when the canvas pane is clicked', async () => {
        const onSelect = vi.fn();

        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree: createTree(),
                    onChange: vi.fn(),
                    onSelect,
                }),
            );
        });

        await act(async () => {
            renderer!.root.findByProps({ 'data-testid': 'pane' }).props.onClick();
        });

        expect(onSelect).toHaveBeenCalledWith({ kind: null, id: null });
    });

    it('contextually fits the viewport when a node is selected', async () => {
        vi.useFakeTimers();
        reactFlowState.fitView.mockClear();

        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree: createTree(),
                    onChange: vi.fn(),
                    selected: { kind: 'node', id: 'start' },
                }),
            );
        });

        await act(async () => {
            vi.advanceTimersByTime(300);
        });

        expect(reactFlowState.fitView).toHaveBeenCalledWith(
            expect.objectContaining({ padding: 0.35, maxZoom: 1.25 }),
        );
        vi.useRealTimers();
    });

    it('does not contextually fit the viewport when an edge is selected', async () => {
        vi.useFakeTimers();
        reactFlowState.fitView.mockClear();

        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree: createTree(),
                    onChange: vi.fn(),
                    selected: { kind: 'edge', id: 't1' },
                }),
            );
        });

        await act(async () => {
            vi.advanceTimersByTime(300);
        });

        expect(reactFlowState.fitView).not.toHaveBeenCalled();
        vi.useRealTimers();
    });

    it('focuses and fits the graph when requested and swallows reactflow errors', async () => {
        vi.useFakeTimers();
        reactFlowState.getNode.mockReturnValueOnce({ position: { x: 10, y: 20 } });
        reactFlowState.getNode.mockImplementationOnce(() => {
            throw new Error('focus failed');
        });
        reactFlowState.fitView.mockImplementationOnce(() => undefined);
        reactFlowState.fitView.mockImplementationOnce(() => {
            throw new Error('fit failed');
        });

        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree: createTree(),
                    onChange: vi.fn(),
                    focusNodeId: 'start',
                    fitViewNonce: 1,
                })
            );
        });

        expect(reactFlowState.setCenter).toHaveBeenCalledWith(160, 80, { zoom: 1, duration: 300 });

        await act(async () => {
            vi.advanceTimersByTime(100);
        });
        expect(reactFlowState.fitView).toHaveBeenCalledWith({ padding: 0.2, duration: 300 });

        await act(async () => {
            renderer!.update(
                React.createElement(TreeSpecGraphEditor, {
                    tree: createTree(),
                    onChange: vi.fn(),
                    focusNodeId: 'start',
                    fitViewNonce: 2,
                })
            );
        });

        await act(async () => {
            vi.advanceTimersByTime(100);
        });
        expect(reactFlowState.fitView).toHaveBeenCalledTimes(2);

        reactFlowState.getNode.mockReturnValueOnce(null);
        await act(async () => {
            renderer!.update(
                React.createElement(TreeSpecGraphEditor, {
                    tree: createTree(),
                    onChange: vi.fn(),
                    focusNodeId: 'start',
                    fitViewNonce: 3,
                })
            );
        });
    });

    it('creates transitions from connections and ignores incomplete connections', async () => {
        const onChange = vi.fn();

        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree: createTree(),
                    onChange,
                })
            );
        });

        await act(async () => {
            reactFlowState.latestProps.onConnect({
                source: 'start',
                target: END_NODE_ID,
                sourceHandle: 'choice:c2',
            });
        });
        expect(onChange.mock.calls[0][0].transitions.at(-1)).toMatchObject({
            fromNodeId: 'start',
            fromChoiceId: 'c2',
            toNodeId: END_NODE_ID,
            outcome: 'safe',
        });

        onChange.mockClear();
        await act(async () => {
            reactFlowState.latestProps.onConnect({
                source: 'start',
                target: 'review',
                sourceHandle: 'plain-choice',
            });
        });
        expect(onChange).not.toHaveBeenCalled();

        onChange.mockClear();
        await act(async () => {
            reactFlowState.latestProps.onConnect({
                source: 'start',
                target: 'review',
            });
        });
        expect(onChange).not.toHaveBeenCalled();
    });

    it('replaces an existing transition when reconnecting the same choice handle', async () => {
        const onChange = vi.fn();

        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree: createTree(),
                    onChange,
                }),
            );
        });

        await act(async () => {
            reactFlowState.latestProps.onConnect({
                source: 'start',
                target: END_NODE_ID,
                sourceHandle: 'choice:c1',
            });
        });

        const nextTree = onChange.mock.calls[0][0];
        expect(nextTree.transitions.filter((t: { fromChoiceId: string }) => t.fromChoiceId === 'c1')).toHaveLength(1);
        expect(nextTree.transitions.find((t: { fromChoiceId: string }) => t.fromChoiceId === 'c1')?.toNodeId).toBe(
            END_NODE_ID,
        );
    });

    it('validates connections, reconnects targets, and deletes edges through callbacks', async () => {
        const onChange = vi.fn();
        const tree = createTree();

        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree,
                    onChange,
                }),
            );
        });

        expect(
            reactFlowState.latestProps.isValidConnection({
                source: 'start',
                target: 'missing-node',
                sourceHandle: 'choice:c1',
            }),
        ).toBe(false);
        expect(reactFlowState.latestProps.connectionMode).toBe('strict');

        onChange.mockClear();
        await act(async () => {
            reactFlowState.latestProps.onReconnect(
                { id: 't1', source: 'start', sourceHandle: 'choice:c1', target: 'review' },
                { source: 'start', target: END_NODE_ID, targetHandle: 'in' },
            );
        });
        expect(onChange.mock.calls[0][0].transitions[0]).toMatchObject({
            id: 't1',
            toNodeId: END_NODE_ID,
            outcome: 'at_risk',
        });

        onChange.mockClear();
        await act(async () => {
            reactFlowState.latestProps.onEdgesDelete([{ id: 't1' }]);
        });
        expect(onChange.mock.calls[0][0].transitions).toHaveLength(1);
        expect(onChange.mock.calls[0][0].transitions[0]?.id).toBe('t2');
    });

    it('commits node and edge changes while skipping selection-only updates', async () => {
        const onChange = vi.fn();
        reactFlowState.initialEdgesTransform = (edges) =>
            edges.map((edge) =>
                edge.id === 't1'
                    ? {
                          ...edge,
                          id: undefined,
                      }
                    : edge
            );

        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree: createTree(),
                    onChange,
                })
            );
        });

        await act(async () => {
            reactFlowState.latestProps.onNodesChange([{ id: 'start', type: 'select', selected: true }]);
            reactFlowState.latestProps.onNodesChange([{ id: 'start', type: 'dimensions' }]);
            reactFlowState.latestProps.onNodesChange([
                { id: 'start', type: 'position', position: { x: 110, y: 210 }, dragging: true },
            ]);
        });
        await flushMicrotasks();
        expect(onChange).not.toHaveBeenCalled();

        await act(async () => {
            reactFlowState.latestProps.onNodeDragStart();
            reactFlowState.latestProps.onNodesChange([
                { id: 'start', type: 'position', position: { x: 120, y: 220 }, dragging: false },
            ]);
        });
        await flushMicrotasks();
        expect(onChange).not.toHaveBeenCalled();

        await act(async () => {
            reactFlowState.latestProps.onNodeDragStop();
        });
        expect(onChange.mock.calls[0][0].nodes.start.position).toEqual({ x: 120, y: 220 });
        expect(onChange.mock.calls[0][0].transitions[0].id).toBeTruthy();

        onChange.mockClear();
        await act(async () => {
            reactFlowState.setNodes?.((prev: any[]) => [
                ...prev,
                {
                    id: 'ghost',
                    type: 'promptNode',
                    position: { x: 300, y: 400 },
                    data: {
                        node: {
                            id: 'ghost',
                            type: 'prompt',
                            prompt: 'Ghost',
                            choices: [],
                            position: { x: 300, y: 400 },
                        },
                        isStart: false,
                        issuesTotal: 0,
                        issuesErrors: 0,
                        issuesWarnings: 0,
                        issuesInfo: 0,
                    },
                },
            ]);
            reactFlowState.latestProps.onNodesChange([
                { id: 'start', type: 'position', position: { x: 140, y: 240 }, dragging: false },
            ]);
            reactFlowState.latestProps.onEdgesChange([{ id: 't1', type: 'select', selected: true }]);
        });
        await flushMicrotasks();
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][0].nodes.start.position).toEqual({ x: 140, y: 240 });

        onChange.mockClear();
        await act(async () => {
            reactFlowState.latestProps.onEdgesChange([{ id: 't1', type: 'remove' }]);
        });
        await flushMicrotasks();
        expect(onChange.mock.calls[0][0].transitions).toHaveLength(1);
        expect(onChange.mock.calls[0][0].transitions[0]).toMatchObject({
            fromNodeId: 'start',
            fromChoiceId: 'c2',
            toNodeId: END_NODE_ID,
            outcome: 'safe',
        });
        expect(onChange.mock.calls[0][0].transitions[0].id).not.toBe('');
    });

    it('marks locked nodes as not draggable', async () => {
        const base = createTree();
        const tree: EditorTree = {
            ...base,
            nodes: {
                ...base.nodes,
                start: {
                    ...base.nodes.start!,
                    render_hints: { editor: { locked: true } },
                },
            },
        };

        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree,
                    issues: [],
                    onChange: vi.fn(),
                }),
            );
        });

        const startNode = reactFlowState.latestProps.nodes.find((n: { id: string }) => n.id === 'start');
        expect(startNode?.draggable).toBe(false);
    });

    it('applies theme render hints to the node card', async () => {
        const base = createTree();
        const tree: EditorTree = {
            ...base,
            nodes: {
                ...base.nodes,
                review: {
                    ...base.nodes.review!,
                    render_hints: {
                        editor: { backgroundColor: '#abcdef', foregroundColor: '#123456' },
                    },
                },
            },
        };

        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree,
                    issues: [],
                    onChange: vi.fn(),
                }),
            );
        });

        const reviewBtn = renderer!.root.findByProps({ 'data-testid': 'node-review' });
        const styled = reviewBtn.findAll(
            (n) =>
                n.type === 'div' &&
                n.props.style?.backgroundColor === '#abcdef' &&
                n.props.style?.color === '#123456',
        );
        expect(styled.length).toBeGreaterThan(0);
    });

    it('uses a dedicated drag handle and wires canvas context-menu callbacks', async () => {
        const onDuplicateNode = vi.fn();
        const onDeleteNode = vi.fn();
        const onAutoLayout = vi.fn();

        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree: createTree(),
                    onChange: vi.fn(),
                    onDuplicateNode,
                    onDeleteNode,
                    onAutoLayout,
                }),
            );
        });

        const startNode = reactFlowState.latestProps.nodes.find((node: { id: string }) => node.id === 'start');
        expect(startNode?.dragHandle).toBe('.graph-editor-drag-handle');
        expect(typeof reactFlowState.latestProps.onNodeContextMenu).toBe('function');
        expect(typeof reactFlowState.latestProps.onPaneContextMenu).toBe('function');

        await act(async () => {
            reactFlowState.latestProps.onNodeContextMenu(
                { preventDefault: vi.fn(), clientX: 10, clientY: 20 },
                { id: 'start' },
            );
        });
        expect(renderer!.root.findAllByProps({ role: 'menu' }).length).toBeGreaterThan(0);

        await act(async () => {
            reactFlowState.latestProps.onPaneContextMenu({
                preventDefault: vi.fn(),
                clientX: 40,
                clientY: 50,
            });
        });
        expect(renderer!.root.findAllByProps({ role: 'menu' }).length).toBeGreaterThan(0);
    });

    it('persists node resize dimensions through onChange', async () => {
        const onChange = vi.fn();

        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree: createTree(),
                    onChange,
                    selected: { kind: 'node', id: 'start' },
                }),
            );
        });

        const resizer = renderer!.root.findAllByProps({ 'data-testid': 'node-resizer' });
        expect(resizer.length).toBeGreaterThan(0);

        onChange.mockClear();
        await act(async () => {
            resizer[0].props.onClick();
        });

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][0].nodes.start.render_hints?.editor?.width).toBe(320);
        expect(onChange.mock.calls[0][0].nodes.start.render_hints?.editor?.height).toBe(160);
    });

    it('spawns a node when a connection is dropped on the pane', async () => {
        const onChange = vi.fn();
        const onSelect = vi.fn();

        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree: createTree(),
                    onChange,
                    onSelect,
                }),
            );
        });

        await act(async () => {
            reactFlowState.latestProps.onConnectStart({}, { nodeId: 'start', handleId: 'choice:c1', handleType: 'source' });
        });

        onChange.mockClear();
        class FakePaneElement {
            classList = {
                contains: (value: string) => value === 'react-flow__pane',
            };
        }
        await act(async () => {
            reactFlowState.latestProps.onConnectEnd({
                clientX: 400,
                clientY: 300,
                target: new FakePaneElement(),
            });
        });

        expect(reactFlowState.screenToFlowPosition).toHaveBeenCalledWith({ x: 400, y: 300 });
        expect(onChange).toHaveBeenCalledTimes(1);
        const nextTree = onChange.mock.calls[0][0];
        expect(Object.keys(nextTree.nodes).length).toBeGreaterThan(2);
        expect(onSelect).toHaveBeenCalled();
    });

    it('falls back to onSelect when onChoiceSelect is not provided', async () => {
        const onSelect = vi.fn();
        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree: createTree(),
                    onChange: vi.fn(),
                    selected: { kind: 'node', id: 'start' },
                    onSelect,
                }),
            );
        });

        const choiceRow = renderer!.root.findAll(
            (node) =>
                node.type === 'button' &&
                typeof node.props.className === 'string' &&
                node.props.className.includes('graph-editor-choice-row-selectable'),
        );
        expect(choiceRow.length).toBeGreaterThan(0);

        await act(async () => {
            choiceRow[0].props.onClick({ stopPropagation: vi.fn() });
        });
        expect(onSelect).toHaveBeenCalledWith({ kind: GRAPH_SELECTION_KIND.NODE, id: 'start' });
    });

    it('invokes context menu actions for duplicate and auto layout', async () => {
        const onDuplicateNode = vi.fn();
        const onAutoLayout = vi.fn();

        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree: createTree(),
                    onChange: vi.fn(),
                    onDuplicateNode,
                    onDeleteNode: vi.fn(),
                    onAutoLayout,
                }),
            );
        });

        await act(async () => {
            reactFlowState.latestProps.onNodeContextMenu(
                { preventDefault: vi.fn(), clientX: 12, clientY: 24 },
                { id: 'start' },
            );
        });

        const duplicateItem = renderer!.root.findAll(
            (node) => node.type === 'button' && node.props.children === 'Duplicate node',
        );
        expect(duplicateItem).toHaveLength(1);
        await act(async () => {
            duplicateItem[0].props.onClick();
        });
        expect(onDuplicateNode).toHaveBeenCalledWith('start');

        await act(async () => {
            reactFlowState.latestProps.onPaneContextMenu({
                preventDefault: vi.fn(),
                clientX: 40,
                clientY: 50,
            });
        });
        const layoutItem = renderer!.root.findAll(
            (node) => node.type === 'button' && node.props.children === 'Auto layout',
        );
        await act(async () => {
            layoutItem[0].props.onClick();
        });
        expect(onAutoLayout).toHaveBeenCalled();
    });

    it('closes the context menu on Escape and outside pointer down', async () => {
        const listeners = new Map<string, Set<EventListener>>();
        const originalDocument = globalThis.document;
        const mockDocument = {
            addEventListener(type: string, listener: EventListener) {
                if (!listeners.has(type)) listeners.set(type, new Set());
                listeners.get(type)!.add(listener);
            },
            removeEventListener(type: string, listener: EventListener) {
                listeners.get(type)?.delete(listener);
            },
            dispatchEvent(event: Event) {
                listeners.get(event.type)?.forEach((listener) => listener(event));
                return true;
            },
        };
        (globalThis as { document?: typeof mockDocument }).document = mockDocument;

        try {
            await act(async () => {
                renderer = TestRenderer.create(
                    React.createElement(TreeSpecGraphEditor, {
                        tree: createTree(),
                        onChange: vi.fn(),
                        onDuplicateNode: vi.fn(),
                        onDeleteNode: vi.fn(),
                    }),
                );
            });

            await act(async () => {
                reactFlowState.latestProps.onNodeContextMenu(
                    { preventDefault: vi.fn(), clientX: 12, clientY: 24 },
                    { id: 'start' },
                );
            });

            let menuItems = renderer!.root.findAll(
                (node) => node.type === 'button' && node.props.children === 'Duplicate node',
            );
            expect(menuItems).toHaveLength(1);

            await act(async () => {
                mockDocument.dispatchEvent({ type: 'keydown', key: 'Escape' } as KeyboardEvent);
            });

            menuItems = renderer!.root.findAll(
                (node) => node.type === 'button' && node.props.children === 'Duplicate node',
            );
            expect(menuItems).toHaveLength(0);

            await act(async () => {
                reactFlowState.latestProps.onNodeContextMenu(
                    { preventDefault: vi.fn(), clientX: 20, clientY: 30 },
                    { id: 'start' },
                );
            });
            menuItems = renderer!.root.findAll(
                (node) => node.type === 'button' && node.props.children === 'Duplicate node',
            );
            expect(menuItems).toHaveLength(1);

            await act(async () => {
                mockDocument.dispatchEvent({ type: 'pointerdown' } as Event);
            });
            menuItems = renderer!.root.findAll(
                (node) => node.type === 'button' && node.props.children === 'Duplicate node',
            );
            expect(menuItems).toHaveLength(0);
        } finally {
            (globalThis as { document?: Document }).document = originalDocument;
        }
    });

    it('ignores onConnectEnd when the drop target is not the pane', async () => {
        const onChange = vi.fn();

        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree: createTree(),
                    onChange,
                }),
            );
        });

        await act(async () => {
            reactFlowState.latestProps.onConnectStart({}, { nodeId: 'start', handleId: 'choice:c1', handleType: 'source' });
        });

        onChange.mockClear();
        class FakeNonPaneElement {
            classList = {
                contains: () => false,
            };
        }
        await act(async () => {
            reactFlowState.latestProps.onConnectEnd({
                clientX: 400,
                clientY: 300,
                target: new FakeNonPaneElement(),
            });
        });

        expect(onChange).not.toHaveBeenCalled();
    });

    it('clears pending connect when connect start lacks node or handle', async () => {
        const onChange = vi.fn();

        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree: createTree(),
                    onChange,
                }),
            );
        });

        await act(async () => {
            reactFlowState.latestProps.onConnectStart({}, { nodeId: null, handleId: 'choice:c1', handleType: 'source' });
        });

        class FakePaneElement {
            classList = {
                contains: (value: string) => value === 'react-flow__pane',
            };
        }
        await act(async () => {
            reactFlowState.latestProps.onConnectEnd({
                clientX: 400,
                clientY: 300,
                target: new FakePaneElement(),
            });
        });

        expect(onChange).not.toHaveBeenCalled();
    });

    it('skips pane drop when the editor is read-only', async () => {
        const onChange = vi.fn();

        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree: createTree(),
                    onChange,
                    readOnly: true,
                }),
            );
        });

        await act(async () => {
            reactFlowState.latestProps.onConnectStart({}, { nodeId: 'start', handleId: 'choice:c1', handleType: 'source' });
        });

        class FakePaneElement {
            classList = {
                contains: (value: string) => value === 'react-flow__pane',
            };
        }
        await act(async () => {
            reactFlowState.latestProps.onConnectEnd({
                clientX: 400,
                clientY: 300,
                target: new FakePaneElement(),
            });
        });

        expect(onChange).not.toHaveBeenCalled();
    });

    it('supports choice drag-and-drop reorder handlers', async () => {
        const onRepositionChoice = vi.fn();
        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree: createTree(),
                    onChange: vi.fn(),
                    selected: { kind: 'node', id: 'start' },
                    onRepositionChoice,
                }),
            );
        });

        const dragHandle = renderer!.root.findAll(
            (node) =>
                node.type === 'button' &&
                node.props['aria-label'] === 'Drag choice' &&
                node.props.draggable,
        );
        expect(dragHandle.length).toBeGreaterThan(0);

        const dataTransfer = {
            effectAllowed: 'move',
            dropEffect: 'move',
            setData: vi.fn(),
        };
        await act(async () => {
            dragHandle[0].props.onDragStart({
                stopPropagation: vi.fn(),
                dataTransfer,
            });
        });
        expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'start::c1');

        const choiceRows = renderer!.root.findAll(
            (node) =>
                node.type === 'li' &&
                typeof node.props.onDragOver === 'function' &&
                typeof node.props.onDrop === 'function',
        );
        expect(choiceRows.length).toBeGreaterThan(1);

        await act(async () => {
            choiceRows[1].props.onDragOver({
                preventDefault: vi.fn(),
                stopPropagation: vi.fn(),
                dataTransfer,
            });
            choiceRows[1].props.onDrop({
                preventDefault: vi.fn(),
                stopPropagation: vi.fn(),
            });
        });
        expect(onRepositionChoice).toHaveBeenCalled();
    });

    it('persists viewport changes through onMoveEnd', async () => {
        vi.useFakeTimers();
        const onChange = vi.fn();

        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree: createTree(),
                    onChange,
                }),
            );
        });

        await act(async () => {
            vi.advanceTimersByTime(0);
        });

        onChange.mockClear();
        await act(async () => {
            reactFlowState.latestProps.onMoveEnd({}, { x: 12, y: 34, zoom: 0.8 });
        });

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][0]._meta?.graph_editor?.viewport).toEqual({
            x: 12,
            y: 34,
            zoom: 0.8,
        });
        vi.useRealTimers();
    });

    it('supports TouchEvent coordinates when dropping a connection on the pane', async () => {
        const onChange = vi.fn();
        const onSelect = vi.fn();

        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree: createTree(),
                    onChange,
                    onSelect,
                }),
            );
        });

        await act(async () => {
            reactFlowState.latestProps.onConnectStart({}, { nodeId: 'start', handleId: 'choice:c1', handleType: 'source' });
        });

        onChange.mockClear();
        class FakePaneElement {
            classList = {
                contains: (value: string) => value === 'react-flow__pane',
            };
        }
        await act(async () => {
            reactFlowState.latestProps.onConnectEnd({
                changedTouches: [{ clientX: 500, clientY: 400 }],
                target: new FakePaneElement(),
            });
        });

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onSelect).toHaveBeenCalled();
    });

    it('selects a choice with the keyboard without bubbling to the node card', async () => {
        const onChoiceSelect = vi.fn();

        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree: createTree(),
                    onChange: vi.fn(),
                    selected: { kind: 'node', id: 'start' },
                    onChoiceSelect,
                }),
            );
        });

        const choiceButton = renderer!.root.findAll(
            (node) =>
                node.type === 'button' &&
                typeof node.props.className === 'string' &&
                node.props.className.includes('graph-editor-choice-row-selectable'),
        );
        expect(choiceButton.length).toBeGreaterThan(0);

        await act(async () => {
            choiceButton[0].props.onKeyDown({
                key: 'Enter',
                preventDefault: vi.fn(),
                stopPropagation: vi.fn(),
            });
        });
        expect(onChoiceSelect).toHaveBeenCalledWith('start', 'c1');
    });

    it('does not select a choice when the drag handle is clicked', async () => {
        const onChoiceSelect = vi.fn();

        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree: createTree(),
                    onChange: vi.fn(),
                    onChoiceSelect,
                }),
            );
        });

        const dragHandle = renderer!.root.findAll(
            (node) =>
                node.type === 'button' &&
                typeof node.props.className === 'string' &&
                node.props.className.includes(CHOICE_DRAG_HANDLE_CLASS),
        );
        expect(dragHandle.length).toBeGreaterThan(0);

        const dragTarget = {
            closest: (selector: string) => (selector === '.graph-editor-choice-drag-handle' ? dragTarget : null),
        };
        const choiceButton = renderer!.root.findAll(
            (node) =>
                node.type === 'button' &&
                typeof node.props.className === 'string' &&
                node.props.className.includes('graph-editor-choice-row-selectable'),
        );

        await act(async () => {
            choiceButton[0].props.onClick({
                stopPropagation: vi.fn(),
                target: dragTarget,
            });
        });
        expect(onChoiceSelect).not.toHaveBeenCalled();
    });

    it('highlights the END node when it is selected', async () => {
        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree: createTree(),
                    onChange: vi.fn(),
                    selected: { kind: 'node', id: END_NODE_ID },
                }),
            );
        });

        const endBtn = renderer!.root.findByProps({ 'data-testid': `node-${END_NODE_ID}` });
        const highlighted = endBtn.findAll(
            (node) =>
                node.type === 'div' &&
                typeof node.props.className === 'string' &&
                node.props.className.includes(CANVAS_NODE_SELECTED_CLASS),
        );
        expect(highlighted.length).toBeGreaterThan(0);
    });

    it('returns no context menu items for the END node', async () => {
        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree: createTree(),
                    onChange: vi.fn(),
                    onDuplicateNode: vi.fn(),
                    onDeleteNode: vi.fn(),
                }),
            );
        });

        await act(async () => {
            reactFlowState.latestProps.onNodeContextMenu(
                { preventDefault: vi.fn(), clientX: 10, clientY: 20 },
                { id: END_NODE_ID },
            );
        });

        expect(renderer!.root.findAllByProps({ role: 'menu' })).toHaveLength(0);
    });

    it('does not render a resizer for locked nodes', async () => {
        const onChange = vi.fn();
        const base = createTree();
        const tree: EditorTree = {
            ...base,
            nodes: {
                ...base.nodes,
                start: {
                    ...base.nodes.start!,
                    render_hints: { editor: { locked: true } },
                },
            },
        };

        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree,
                    onChange,
                    selected: { kind: 'node', id: 'start' },
                }),
            );
        });

        expect(renderer!.root.findAllByProps({ 'data-testid': 'node-resizer' })).toHaveLength(0);
        expect(onChange).not.toHaveBeenCalled();
    });

    it('swallows setCenter failures while focusing a node', async () => {
        vi.useFakeTimers();
        reactFlowState.getNode.mockReturnValueOnce({ position: { x: 10, y: 20 } });
        reactFlowState.setCenter.mockImplementationOnce(() => {
            throw new Error('setCenter failed');
        });

        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree: createTree(),
                    onChange: vi.fn(),
                    focusNodeId: 'start',
                }),
            );
        });

        expect(reactFlowState.setCenter).toHaveBeenCalled();
        vi.useRealTimers();
    });

    it('swallows contextual fitView failures for selected nodes', async () => {
        vi.useFakeTimers();
        reactFlowState.fitView.mockImplementationOnce(() => {
            throw new Error('contextual fit failed');
        });

        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree: createTree(),
                    onChange: vi.fn(),
                    selected: { kind: 'node', id: 'review' },
                }),
            );
        });

        await act(async () => {
            vi.advanceTimersByTime(300);
        });
        expect(reactFlowState.fitView).toHaveBeenCalled();
        vi.useRealTimers();
    });

    it('highlights the append drop zone when dragging over the end of the list', async () => {
        const onRepositionChoice = vi.fn();

        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree: createTree(),
                    onChange: vi.fn(),
                    selected: { kind: 'node', id: 'start' },
                    onRepositionChoice,
                }),
            );
        });

        const dragHandle = renderer!.root.findAll(
            (node) =>
                node.type === 'button' &&
                node.props['aria-label'] === 'Drag choice' &&
                node.props.draggable,
        );
        const dataTransfer = {
            effectAllowed: 'move',
            dropEffect: 'move',
            setData: vi.fn(),
        };

        await act(async () => {
            dragHandle[0].props.onDragStart({
                stopPropagation: vi.fn(),
                dataTransfer,
            });
        });

        const startNodeBtn = renderer!.root.findByProps({ 'data-testid': 'node-start' });
        const choiceList = startNodeBtn.findAll(
            (node) => node.type === 'ul' && node.props['aria-label'] === 'Node choices',
        );
        expect(choiceList).toHaveLength(1);

        await act(async () => {
            choiceList[0].props.onDragOver({
                preventDefault: vi.fn(),
                stopPropagation: vi.fn(),
                dataTransfer,
            });
        });

        const appendZone = renderer!.root.findAll(
            (node) =>
                node.type === 'li' &&
                typeof node.props.className === 'string' &&
                node.props.className.includes(CHOICE_DROP_APPEND_CLASS) &&
                node.props.className.includes(CHOICE_DROP_TARGET_CLASS),
        );
        expect(appendZone).toHaveLength(1);

        await act(async () => {
            choiceList[0].props.onDrop({
                preventDefault: vi.fn(),
                stopPropagation: vi.fn(),
            });
        });

        expect(onRepositionChoice).toHaveBeenCalledWith('start', 'c1', 'start', 2);
    });

    it('ignores failed reconnects and empty edge deletions', async () => {
        const onChange = vi.fn();

        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree: createTree(),
                    onChange,
                }),
            );
        });

        onChange.mockClear();
        await act(async () => {
            reactFlowState.latestProps.onReconnect(
                { id: 't1', source: 'start', sourceHandle: 'choice:c1', target: 'review' },
                { source: 'review', target: END_NODE_ID, targetHandle: 'in' },
            );
        });
        expect(onChange).not.toHaveBeenCalled();

        onChange.mockClear();
        await act(async () => {
            reactFlowState.latestProps.onEdgesDelete([]);
        });
        expect(onChange).not.toHaveBeenCalled();
    });
});
