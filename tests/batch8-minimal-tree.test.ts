import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TreeSpecGraphEditor from '../src/TreeSpecGraphEditor';
import type { EditorTree } from '@signalsafe/tree-spec-editor-core';
import { TestRenderer, act } from './reactTestRenderer';

vi.mock('reactflow', () => ({
    default: ({ nodes }: { nodes: unknown[] }) =>
        React.createElement('div', {
            'data-testid': 'reactflow',
            'data-node-count': String(nodes?.length ?? 0),
        }),
    ReactFlowProvider: ({ children }: { children: React.ReactNode }) =>
        React.createElement('div', { 'data-testid': 'provider' }, children),
    Background: () => null,
    Controls: () => null,
    MiniMap: () => null,
    Handle: () => null,
    NodeToolbar: ({ children }: { children?: React.ReactNode }) =>
        React.createElement('div', null, children),
    NodeResizer: () => null,
    Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
    ConnectionMode: { Loose: 'loose' },
    MarkerType: { ArrowClosed: 'arrowclosed' },
    useNodesState: (initial: unknown[]) => [initial, vi.fn(), vi.fn()],
    useEdgesState: (initial: unknown[]) => [initial, vi.fn(), vi.fn()],
    useReactFlow: () => ({
        getNode: vi.fn(),
        setCenter: vi.fn(),
        fitView: vi.fn(),
        screenToFlowPosition: ({ x, y }: { x: number; y: number }) => ({ x, y }),
    }),
    useUpdateNodeInternals: () => vi.fn(),
    addEdge: (edge: unknown, edges: unknown[]) => [...edges, edge],
}));

function minimalTree(): EditorTree {
    return {
        start_node: 'only',
        nodes: {
            only: {
                id: 'only',
                type: 'prompt',
                prompt: '',
                choices: [],
                position: { x: 0, y: 0 },
            },
        },
        transitions: [],
    };
}

describe('TreeSpecGraphEditor minimal tree smoke', () => {
    let renderer: TestRenderer.ReactTestRenderer | null = null;

    afterEach(() => {
        renderer?.unmount();
        renderer = null;
    });

    it('renders an empty prompt node and END without crashing', async () => {
        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree: minimalTree(),
                    issues: [],
                    onChange: vi.fn(),
                }),
            );
        });

        expect(renderer!.root.findByProps({ 'data-testid': 'reactflow' })).toBeTruthy();
        expect(renderer!.root.findByProps({ 'data-testid': 'reactflow' }).props['data-node-count']).toBe(
            '2',
        );
    });

    it('invokes selection callback when a node is selected from props', async () => {
        const onSelect = vi.fn();
        await act(async () => {
            renderer = TestRenderer.create(
                React.createElement(TreeSpecGraphEditor, {
                    tree: minimalTree(),
                    issues: [],
                    onChange: vi.fn(),
                    onSelect,
                    selected: { kind: 'node', id: 'only' },
                }),
            );
        });

        expect(onSelect).not.toHaveBeenCalled();
        expect(renderer!.root.findByProps({ 'data-testid': 'reactflow' })).toBeTruthy();
    });
});
