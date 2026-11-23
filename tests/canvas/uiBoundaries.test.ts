import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { END_NODE_ID } from '@signalsafe/tree-spec-editor-core';
import { TestRenderer, act } from '../reactTestRenderer';
import { GraphEditorCanvasContext, useGraphEditorCanvas } from '../../src/GraphEditorCanvasContext';
import { GraphCanvasContextMenu } from '../../src/contextMenu/GraphCanvasContextMenu';
import { PromptNodeToolbar } from '../../src/nodes/PromptNodeToolbar';
import { ChoiceCanvasRow } from '../../src/nodes/ChoiceCanvasRow';
import { PromptNodeChoicesList } from '../../src/nodes/PromptNodeChoicesList';

vi.mock('reactflow', () => ({
    NodeToolbar: ({ children }: { children: React.ReactNode }) =>
        React.createElement('div', null, children),
    Handle: () => null,
    Position: { Bottom: 'bottom', Right: 'right' },
    MarkerType: { ArrowClosed: 'arrowclosed' },
}));
let renderer: ReturnType<typeof TestRenderer.create> | undefined;
afterEach(() => {
    act(() => renderer?.unmount());
});

it('safe canvas defaults are callable outside a provider', () => {
    function Probe() {
        const value = useGraphEditorCanvas();
        expect(value.readOnly).toBe(true);
        expect(value.choiceDrag).toBeNull();
        expect(value.choiceDropTarget).toBeNull();
        value.onDuplicateNode('n');
        value.onDeleteNode('n');
        value.onResizeNode('n', 1, 2);
        value.onResizeNodeStart('n', 1, 2);
        value.onSelectChoice('n', 'c');
        value.onChoiceDragStart('n', 'c');
        value.onChoiceDragEnd();
        value.onChoiceDragOver('n', 1);
        value.onChoiceDrop('n', 1);
        return null;
    }
    act(() => {
        renderer = TestRenderer.create(React.createElement(Probe));
    });
});

it('toolbar forwards node identities exactly once for each action', () => {
    const onDuplicateNode = vi.fn();
    const onDeleteNode = vi.fn();
    act(() => {
        renderer = TestRenderer.create(
            React.createElement(PromptNodeToolbar, { nodeId: 'n1', onDuplicateNode, onDeleteNode }),
        );
    });
    const buttons = renderer!.root.findAllByType('button');
    act(() => buttons[0]!.props.onClick());
    act(() => buttons[1]!.props.onClick());
    expect(onDuplicateNode).toHaveBeenCalledExactlyOnceWith('n1');
    expect(onDeleteNode).toHaveBeenCalledExactlyOnceWith('n1');
});

it('context menu isolates pointer events and offers only supplied capabilities', () => {
    const onClose = vi.fn();
    const onDeleteNode = vi.fn();
    const menu = { kind: 'node' as const, nodeId: 'n1', x: 12, y: 34 };
    act(() => {
        renderer = TestRenderer.create(
            React.createElement(GraphCanvasContextMenu, {
                menu,
                readOnly: false,
                onClose,
                onDeleteNode,
            }),
        );
    });
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();
    renderer!.root.findByProps({ role: 'menu' }).props.onContextMenu({ preventDefault });
    renderer!.root.findByProps({ role: 'menu' }).props.onPointerDown({ stopPropagation });
    act(() => renderer!.root.findByProps({ role: 'menuitem' }).props.onClick());
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(stopPropagation).toHaveBeenCalledOnce();
    expect(onDeleteNode).toHaveBeenCalledExactlyOnceWith('n1');
    expect(onClose).toHaveBeenCalledOnce();
    act(() =>
        renderer!.update(
            React.createElement(GraphCanvasContextMenu, {
                menu: { ...menu, nodeId: END_NODE_ID },
                readOnly: false,
                onClose,
                onDeleteNode,
            }),
        ),
    );
    expect(renderer!.toJSON()).toBeNull();
    act(() =>
        renderer!.update(
            React.createElement(GraphCanvasContextMenu, { menu, readOnly: false, onClose }),
        ),
    );
    expect(renderer!.toJSON()).toBeNull();
});

it('choice drag and keyboard controls preserve read-only and active-drag boundaries', () => {
    const onSelectChoice = vi.fn();
    const onChoiceDragStart = vi.fn();
    const onChoiceDragEnd = vi.fn();
    const onChoiceDragOver = vi.fn();
    const onChoiceDrop = vi.fn();
    const base = {
        readOnly: false,
        onDuplicateNode: vi.fn(),
        onDeleteNode: vi.fn(),
        onResizeNode: vi.fn(),
        onResizeNodeStart: vi.fn(),
        onSelectChoice,
        choiceDrag: null,
        choiceDropTarget: null,
        onChoiceDragStart,
        onChoiceDragEnd,
        onChoiceDragOver,
        onChoiceDrop,
    };
    const row = (readOnly: boolean) =>
        React.createElement(ChoiceCanvasRow, {
            nodeId: 'n1',
            choice: { id: 'c1', label: 'First' },
            choiceIndex: 0,
            focusChoiceId: null,
            choiceTextClass: '',
            readOnly,
        });
    act(() => {
        renderer = TestRenderer.create(
            React.createElement(GraphEditorCanvasContext.Provider, { value: base }, row(false)),
        );
    });
    const event = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: { dropEffect: '', effectAllowed: '', setData: vi.fn() },
        target: null,
    };
    renderer!.root.findByType('li').props.onDragOver(event);
    renderer!.root.findByType('li').props.onDrop(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
    const drag = renderer!.root.findByProps({ 'aria-label': 'Drag choice' });
    drag.props.onDragStart(event);
    drag.props.onClick(event);
    drag.props.onDragEnd();
    expect(event.dataTransfer.effectAllowed).toBe('move');
    expect(event.dataTransfer.setData).toHaveBeenCalledExactlyOnceWith('text/plain', 'n1::c1');
    expect(onChoiceDragStart).toHaveBeenCalledExactlyOnceWith('n1', 'c1');
    expect(onChoiceDragEnd).toHaveBeenCalledOnce();
    act(() =>
        renderer!.update(
            React.createElement(
                GraphEditorCanvasContext.Provider,
                {
                    value: {
                        ...base,
                        choiceDrag: { sourceNodeId: 'n1', choiceId: 'c1' },
                        choiceDropTarget: { nodeId: 'n1', index: 0 },
                    },
                },
                row(false),
            ),
        ),
    );
    expect(renderer!.root.findByType('li').props.className).toContain('choice-drop-target');
    const select = renderer!.root.findAllByType('button')[1]!;
    select.props.onClick({ ...event, target: { closest: () => ({}) } });
    select.props.onKeyDown({ ...event, key: 'Escape' });
    expect(onSelectChoice).not.toHaveBeenCalled();
    select.props.onKeyDown({ ...event, key: ' ' });
    expect(onSelectChoice).toHaveBeenCalledExactlyOnceWith('n1', 'c1');
    act(() =>
        renderer!.update(
            React.createElement(
                GraphEditorCanvasContext.Provider,
                { value: { ...base, choiceDrag: { sourceNodeId: 'n1', choiceId: 'c1' } } },
                row(true),
            ),
        ),
    );
    renderer!.root.findByType('li').props.onDragOver(event);
    renderer!.root.findByType('li').props.onDrop(event);
    const disabled = renderer!.root.findByType('button');
    disabled.props.onClick(event);
    disabled.props.onKeyDown({ ...event, key: 'Enter' });
    expect(onSelectChoice).toHaveBeenCalledTimes(1);
    expect(onChoiceDragOver).not.toHaveBeenCalled();
    expect(onChoiceDrop).not.toHaveBeenCalled();
});

it('empty and read-only choice lists never accept a drag without the editable capability', () => {
    const onChoiceDragOver = vi.fn();
    const onChoiceDrop = vi.fn();
    const props = {
        nodeId: 'n1',
        choices: [],
        focusChoiceId: null,
        choiceTextClass: '',
        readOnly: false,
        choiceDrag: null,
        choiceDropTarget: null,
        onChoiceDragOver,
        onChoiceDrop,
    };
    act(() => {
        renderer = TestRenderer.create(React.createElement(PromptNodeChoicesList, props));
    });
    const event = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: { dropEffect: '' },
    };
    renderer!.root.findByType('ul').props.onDragOver(event);
    renderer!.root.findByType('ul').props.onDrop(event);
    act(() =>
        renderer!.update(
            React.createElement(PromptNodeChoicesList, {
                ...props,
                readOnly: true,
                choiceDrag: { sourceNodeId: 'n1', choiceId: 'c1' },
            }),
        ),
    );
    renderer!.root.findByType('ul').props.onDragOver(event);
    renderer!.root.findByType('ul').props.onDrop(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(onChoiceDragOver).not.toHaveBeenCalled();
    expect(onChoiceDrop).not.toHaveBeenCalled();
});
