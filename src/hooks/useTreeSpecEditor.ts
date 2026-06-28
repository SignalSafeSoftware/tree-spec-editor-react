import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
    compileTreeSpec,
    decompileTreeSpec,
    TERMINAL_OUTCOME,
    TREE_SPEC_ISSUE_SEVERITY,
} from '@signalsafe/tree-spec';
import type { TreeSpecIssue, TreeSpecWire } from '@signalsafe/tree-spec';

import {
    applyTreeTemplate,
    autoLayoutTree,
    AUTOSAVE_STATUS,
    type AutosaveStatus,
    deleteNode,
    deleteTransitionsForChoice,
    END_NODE_ID,
    getNextSpawnPosition,
    getTransition,
    GRAPH_SELECTION_KIND,
    moveChoiceInTree,
    moveNodeChoice,
    patchChoiceEdgeHints,
    patchGraphEditorMeta,
    renameNodeChoiceId,
    safeUUID,
    upsertTransition,
    type EditorChoice,
    type EditorNode,
    type EditorTransition,
    type EditorTree,
    type GraphEditorEdgeType,
    type TreeTemplateSpec,
} from '@signalsafe/tree-spec-editor-core';

import { useEditorAdapter } from './useEditorAdapter.js';
import { useEditorAutosave } from './useEditorAutosave.js';
import { useEditorHistory } from './useEditorHistory.js';
import { useEditorSelection } from './useEditorSelection.js';
import type {
    UseTreeSpecEditorActions,
    UseTreeSpecEditorOptions,
    UseTreeSpecEditorResult,
    UseTreeSpecEditorState,
} from './types.js';
import { dispatchEditorKeyboardShortcut, resolveEditorKeyboardShortcutAction } from './keyboardShortcutDispatch.js';

const DEFAULT_AUTOSAVE_DEBOUNCE_MS = 2500;

function isTextFieldTarget(target: EventTarget | null): boolean {
    const tag = target instanceof HTMLElement ? target.tagName.toLowerCase() : '';
    return (
        tag === 'input' ||
        tag === 'textarea' ||
        (target instanceof HTMLElement && target.getAttribute('contenteditable') === 'true')
    );
}

/**
 * Headless React hook that owns the full stateful behavior of the SignalSafe
 * TreeSpec graph editor — loading, autosave, validation, publish, snapshots,
 * audit, clone-to-draft, selection, focus + fit-view, node/choice operations,
 * and keyboard shortcuts. Consumers compose their own UI (toolbar, panels,
 * modals, layout) on top of the returned state + actions.
 */
export function useTreeSpecEditor(options: UseTreeSpecEditorOptions): UseTreeSpecEditorResult {
    const {
        adapter,
        entityId,
        autosaveDebounceMs = DEFAULT_AUTOSAVE_DEBOUNCE_MS,
        enableAutosave = true,
        enableKeyboardShortcuts = true,
        computeRuntimeIssues,
        debugMode = false,
        onPreview,
    } = options;

    const lastSavedKeyRef = useRef<string>('');
    const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>(AUTOSAVE_STATUS.IDLE);
    const [isPublished, setIsPublished] = useState(false);

    const history = useEditorHistory(isPublished);
    const {
        tree,
        canUndo,
        canRedo,
        hasCopiedNode,
        commitTree,
        replaceTreeWithoutHistory,
        undo,
        redo,
        copySelectedNode: copySelectedNodeInternal,
        pasteCopiedNode: pasteCopiedNodeInternal,
        duplicateNodeById: duplicateNodeByIdInternal,
    } = history;

    const adapterState = useEditorAdapter({
        options,
        tree,
        isPublished,
        setIsPublished,
        replaceTreeWithoutHistory,
        lastSavedKeyRef,
        setAutosaveStatus,
    });

    const selectionState = useEditorSelection(tree);
    const {
        selection,
        focusNodeId,
        focusChoiceId,
        fitViewNonce,
        selectedNode,
        selectedEdge,
        inspectorNode,
        selectChoice,
        applySelection,
        setFocusNodeId,
        setFocusChoiceId,
        triggerResetView,
        selectIssue,
        setSelection,
    } = selectionState;

    useEditorAutosave({
        enableAutosave,
        autosaveDebounceMs,
        entityId,
        tree,
        isPublished,
        saving: adapterState.saving,
        publishing: adapterState.publishing,
        autosaveStatus,
        setAutosaveStatus,
        lastSavedKeyRef,
        saveDraftRef: adapterState.saveDraftRef,
    });

    const baselineTree = useMemo<EditorTree | null>(() => {
        if (!adapterState.rawTreeSpec) return null;
        try {
            return decompileTreeSpec(adapterState.rawTreeSpec);
        } catch {
            return null;
        }
    }, [adapterState.rawTreeSpec]);

    const compiledTreeSpec = useMemo<TreeSpecWire | null>(
        () => (tree ? compileTreeSpec(tree) : null),
        [tree],
    );

    const runtimeIssues = useMemo<TreeSpecIssue[]>(
        () => (compiledTreeSpec && computeRuntimeIssues ? computeRuntimeIssues(compiledTreeSpec) : []),
        [compiledTreeSpec, computeRuntimeIssues],
    );

    const issues = useMemo<TreeSpecIssue[]>(() => {
        const seen = new Set<string>();
        const out: TreeSpecIssue[] = [];
        const groups = debugMode
            ? [adapterState.localIssues, adapterState.serverIssues]
            : [adapterState.localIssues, runtimeIssues, adapterState.serverIssues];
        for (const arr of groups) {
            for (const i of arr) {
                const key = `${i.severity}|${i.message}|${i.node_id ?? ''}|${i.choice_id ?? ''}`;
                if (seen.has(key)) continue;
                seen.add(key);
                out.push(i);
            }
        }
        return out;
    }, [adapterState.localIssues, adapterState.serverIssues, runtimeIssues, debugMode]);

    const canPublish = useMemo(
        () => !issues.some((i) => i.severity === TREE_SPEC_ISSUE_SEVERITY.ERROR),
        [issues],
    );

    const publish = useCallback<UseTreeSpecEditorActions['publish']>(async () => {
        if (!entityId || !tree || !adapter.publish) return;
        adapterState.setPublishing(true);
        try {
            const compiled = compileTreeSpec(tree);
            const vr = await adapterState.validate(compiled);
            if (vr?.valid === false) return;
            if (!canPublish) return;
            await adapter.publish(entityId);
            setIsPublished(true);
        } finally {
            adapterState.setPublishing(false);
        }
    }, [adapter, adapterState, canPublish, entityId, tree]);

    const [nodeSearch, setNodeSearch] = useState('');
    const [issueSearch, setIssueSearch] = useState('');
    const [showMiniMap, setShowMiniMap] = useState(true);

    const addNodeOfType = useCallback<UseTreeSpecEditorActions['addNodeOfType']>(
        (type, patch) => {
            if (!tree) return undefined;
            const id = `n_${safeUUID().slice(0, 8)}`;
            const p = getNextSpawnPosition(tree);
            const nextNode: EditorNode = {
                id,
                type,
                prompt: patch?.prompt ?? '',
                choices: patch?.choices ?? [],
                position: patch?.position ?? p,
            };
            commitTree({ ...tree, nodes: { ...tree.nodes, [id]: nextNode } });
            setSelection({ kind: GRAPH_SELECTION_KIND.NODE, id });
            setFocusNodeId(id);
            return id;
        },
        [tree, commitTree, setSelection, setFocusNodeId],
    );

    const autoLayout = useCallback<UseTreeSpecEditorActions['autoLayout']>(() => {
        if (!tree) return;
        commitTree(autoLayoutTree(tree));
        triggerResetView();
    }, [tree, commitTree, triggerResetView]);

    const insertTemplate = useCallback<UseTreeSpecEditorActions['insertTemplate']>(
        (spec: TreeTemplateSpec) => {
            if (!tree) return;
            const { nextTree, focusNodeId: spawnedFocusNodeId } = applyTreeTemplate(tree, spec);
            commitTree(nextTree);
            setSelection({ kind: GRAPH_SELECTION_KIND.NODE, id: spawnedFocusNodeId });
            setFocusNodeId(spawnedFocusNodeId);
        },
        [tree, commitTree, setSelection, setFocusNodeId],
    );

    const copySelectedNode = useCallback<UseTreeSpecEditorActions['copySelectedNode']>(
        () => copySelectedNodeInternal(selection),
        [copySelectedNodeInternal, selection],
    );

    const pasteCopiedNode = useCallback<UseTreeSpecEditorActions['pasteCopiedNode']>(
        () => pasteCopiedNodeInternal(setSelection, setFocusNodeId),
        [pasteCopiedNodeInternal, setSelection, setFocusNodeId],
    );

    const duplicateNodeById = useCallback<UseTreeSpecEditorActions['duplicateNodeById']>(
        (nodeId: string) => duplicateNodeByIdInternal(nodeId, setSelection, setFocusNodeId),
        [duplicateNodeByIdInternal, setSelection, setFocusNodeId],
    );

    const updateSelectedNode = useCallback<UseTreeSpecEditorActions['updateSelectedNode']>(
        (patch) => {
            if (!tree || !selectedNode) return;
            const next: EditorNode = { ...selectedNode, ...patch };
            commitTree({ ...tree, nodes: { ...tree.nodes, [selectedNode.id]: next } });
        },
        [tree, selectedNode, commitTree],
    );

    const addChoice = useCallback<UseTreeSpecEditorActions['addChoice']>(() => {
        if (!tree || !selectedNode) return;
        const choiceId = `c_${safeUUID().slice(0, 6)}`;
        const nextChoice: EditorChoice = { id: choiceId, label: 'New choice' };
        updateSelectedNode({ choices: [...(selectedNode.choices ?? []), nextChoice] });
    }, [tree, selectedNode, updateSelectedNode]);

    const setChoiceType = useCallback<UseTreeSpecEditorActions['setChoiceType']>(
        (choiceId, typeId, defaultLabel) => {
            if (!tree || !selectedNode) return;
            const next = renameNodeChoiceId(tree, selectedNode.id, choiceId, typeId);
            if (!next) return;

            if (defaultLabel) {
                const node = next.nodes[selectedNode.id];
                if (node) {
                    const choices = (node.choices ?? []).map((choice) => {
                        if (choice.id !== typeId) return choice;
                        if (choice.label === 'New choice' || !choice.label.trim()) {
                            return { ...choice, label: defaultLabel };
                        }
                        return choice;
                    });
                    next.nodes[selectedNode.id] = { ...node, choices };
                }
            }

            commitTree(next);
            if (focusChoiceId === choiceId) {
                selectChoice(selectedNode.id, typeId);
            }
        },
        [tree, selectedNode, commitTree, focusChoiceId, selectChoice],
    );

    const deleteChoice = useCallback<UseTreeSpecEditorActions['deleteChoice']>(
        (choiceId) => {
            if (!tree || !selectedNode) return;
            const nextChoices = (selectedNode.choices ?? []).filter((c: EditorChoice) => c.id !== choiceId);
            const nextTree = deleteTransitionsForChoice(tree, selectedNode.id, choiceId);
            commitTree({
                ...nextTree,
                nodes: {
                    ...nextTree.nodes,
                    [selectedNode.id]: { ...selectedNode, choices: nextChoices },
                },
            });
        },
        [tree, selectedNode, commitTree],
    );

    const moveChoice = useCallback<UseTreeSpecEditorActions['moveChoice']>(
        (choiceId, direction) => {
            if (!tree || !selectedNode) return;
            const nextChoices = moveNodeChoice(selectedNode.choices ?? [], choiceId, direction);
            if (!nextChoices) return;
            commitTree({
                ...tree,
                nodes: {
                    ...tree.nodes,
                    [selectedNode.id]: { ...selectedNode, choices: nextChoices },
                },
            });
        },
        [tree, selectedNode, commitTree],
    );

    const repositionChoice = useCallback<UseTreeSpecEditorActions['repositionChoice']>(
        (fromNodeId, choiceId, toNodeId, toIndex) => {
            if (!tree) return;
            const next = moveChoiceInTree(tree, fromNodeId, choiceId, toNodeId, toIndex);
            if (!next) return;
            commitTree(next);
            selectChoice(toNodeId, choiceId);
        },
        [tree, commitTree, selectChoice],
    );

    const setChoiceTarget = useCallback<UseTreeSpecEditorActions['setChoiceTarget']>(
        (choiceId, targetNodeId) => {
            if (!tree || !selectedNode) return;
            const existing = getTransition(tree, selectedNode.id, choiceId);
            const next: EditorTransition = {
                id: existing?.id ?? safeUUID(),
                fromNodeId: selectedNode.id,
                fromChoiceId: choiceId,
                toNodeId: targetNodeId,
                outcome:
                    targetNodeId === END_NODE_ID
                        ? (existing?.outcome ?? TERMINAL_OUTCOME.AT_RISK)
                        : undefined,
            };
            commitTree(upsertTransition(tree, next));
        },
        [tree, selectedNode, commitTree],
    );

    const setChoiceOutcome = useCallback<UseTreeSpecEditorActions['setChoiceOutcome']>(
        (choiceId, outcome) => {
            if (!tree || !selectedNode) return;
            const existing = getTransition(tree, selectedNode.id, choiceId);
            if (!existing) return;
            if (existing.toNodeId !== END_NODE_ID) return;
            if (
                outcome !== TERMINAL_OUTCOME.SAFE &&
                outcome !== TERMINAL_OUTCOME.AT_RISK &&
                outcome !== TERMINAL_OUTCOME.COMPROMISED
            )
                return;
            commitTree(upsertTransition(tree, { ...existing, outcome }));
        },
        [tree, selectedNode, commitTree],
    );

    const updateChoiceEdgeHints = useCallback<UseTreeSpecEditorActions['updateChoiceEdgeHints']>(
        (nodeId, choiceId, patch) => {
            if (!tree) return;
            const node = tree.nodes[nodeId];
            if (!node) return;
            const choices = (node.choices ?? []).map((choice: EditorChoice) =>
                choice.id === choiceId ? patchChoiceEdgeHints(choice, patch) : choice,
            );
            commitTree({
                ...tree,
                nodes: {
                    ...tree.nodes,
                    [nodeId]: { ...node, choices },
                },
            });
        },
        [tree, commitTree],
    );

    const setDefaultEdgeType = useCallback<UseTreeSpecEditorActions['setDefaultEdgeType']>(
        (edgeType: GraphEditorEdgeType) => {
            if (!tree) return;
            commitTree(patchGraphEditorMeta(tree, { default_edge_type: edgeType }));
        },
        [tree, commitTree],
    );

    const deleteNodeById = useCallback<UseTreeSpecEditorActions['deleteNodeById']>(
        (nodeId: string) => {
            if (!tree || isPublished) return false;
            const nextTree = deleteNode(tree, nodeId);
            if (!nextTree) return false;
            commitTree(nextTree);
            const wasSelected =
                selection.kind === GRAPH_SELECTION_KIND.NODE && selection.id === nodeId;
            if (wasSelected) {
                setSelection({ kind: null, id: null });
                setFocusChoiceId(null);
            }
            if (focusNodeId === nodeId) {
                setFocusNodeId(null);
            }
            return true;
        },
        [
            tree,
            isPublished,
            selection,
            focusNodeId,
            commitTree,
            setSelection,
            setFocusNodeId,
            setFocusChoiceId,
        ],
    );

    const deleteSelectedNode = useCallback<UseTreeSpecEditorActions['deleteSelectedNode']>(() => {
        if (selection.kind !== GRAPH_SELECTION_KIND.NODE || !selection.id) return false;
        return deleteNodeById(selection.id);
    }, [deleteNodeById, selection]);

    useEffect(() => {
        if (!enableKeyboardShortcuts) return;
        if (typeof globalThis.addEventListener !== 'function') return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (isTextFieldTarget(e.target)) return;
            const shortcutAction = resolveEditorKeyboardShortcutAction(e, {
                tree,
                selection,
                canUndo,
                canRedo,
                hasCopiedNode,
                isPublished,
            });

            dispatchEditorKeyboardShortcut(shortcutAction, e, {
                tree,
                selection,
                isPublished,
                onPreview,
                undo,
                redo,
                copySelectedNode,
                pasteCopiedNode,
                deleteSelectedNode,
                saveDraft: () => void adapterState.saveDraftRef.current?.(),
                validate: () => void adapterState.validateRef.current?.(),
                commitTree,
                setSelection: applySelection,
                setFocusNodeId,
            });
        };
        globalThis.addEventListener('keydown', onKeyDown);
        return () => globalThis.removeEventListener('keydown', onKeyDown);
    }, [
        enableKeyboardShortcuts,
        onPreview,
        tree,
        selection,
        deleteSelectedNode,
        canUndo,
        canRedo,
        hasCopiedNode,
        isPublished,
        undo,
        redo,
        copySelectedNode,
        pasteCopiedNode,
        commitTree,
        applySelection,
        setFocusNodeId,
        adapterState.saveDraftRef,
        adapterState.validateRef,
    ]);

    const state: UseTreeSpecEditorState = {
        loading: adapterState.loading,
        saving: adapterState.saving,
        publishing: adapterState.publishing,
        creatingSnapshot: adapterState.creatingSnapshot,
        cloning: adapterState.cloning,
        restoringSnapshotId: adapterState.restoringSnapshotId,
        autosaveStatus,
        lastValidatedAt: adapterState.lastValidatedAt,
        rawTreeSpec: adapterState.rawTreeSpec,
        tree,
        baselineTree,
        compiledTreeSpec,
        isPublished,
        versionInfo: adapterState.versionInfo,
        hasTree: Boolean(tree),
        localIssues: adapterState.localIssues,
        serverIssues: adapterState.serverIssues,
        runtimeIssues,
        issues,
        canPublish,
        selection,
        focusNodeId,
        focusChoiceId,
        fitViewNonce,
        selectedNode,
        selectedEdge,
        inspectorNode,
        nodeSearch,
        issueSearch,
        showMiniMap,
        snapshots: adapterState.snapshots,
        auditEvents: adapterState.auditEvents,
        loadingSnapshots: adapterState.loadingSnapshots,
        loadingAudit: adapterState.loadingAudit,
        showDraftHistory: adapterState.showDraftHistory,
        showAudit: adapterState.showAudit,
        showPublishModal: adapterState.showPublishModal,
        canUndo,
        canRedo,
        hasCopiedNode,
    };

    const actions: UseTreeSpecEditorActions = {
        setTree: commitTree,
        setSelection: applySelection,
        selectChoice,
        setFocusNodeId,
        setFocusChoiceId,
        triggerResetView,
        setNodeSearch,
        setIssueSearch,
        setShowMiniMap,
        setShowDraftHistory: adapterState.setShowDraftHistory,
        setShowAudit: adapterState.setShowAudit,
        setShowPublishModal: adapterState.setShowPublishModal,
        addNodeOfType,
        deleteSelectedNode,
        deleteNodeById,
        autoLayout,
        insertTemplate,
        validate: adapterState.validate,
        saveDraft: adapterState.saveDraft,
        publish,
        createSnapshot: adapterState.createSnapshot,
        restoreSnapshot: adapterState.restoreSnapshot,
        cloneToDraft: adapterState.cloneToDraft,
        updateSelectedNode,
        addChoice,
        setChoiceType,
        deleteChoice,
        moveChoice,
        repositionChoice,
        setChoiceTarget,
        setChoiceOutcome,
        updateChoiceEdgeHints,
        setDefaultEdgeType,
        selectIssue,
        undo,
        redo,
        copySelectedNode,
        pasteCopiedNode,
        duplicateNodeById,
    };

    return { ...state, actions };
}
