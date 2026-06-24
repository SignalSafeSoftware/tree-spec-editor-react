import type {
    AutosaveStatus,
    ChoiceEdgeHints,
    EditorNode,
    EditorTransition,
    EditorTree,
    GraphEditorEdgeType,
    GraphSelection,
    KeyboardShortcutAction,
    TreeSpecAuditEventItem,
    TreeSpecIssue,
    TreeSpecSnapshotItem,
    TreeSpecWire,
    TreeTemplateSpec,
} from '@signalsafe/tree-spec-editor-core';

/**
 * Optional metadata returned with {@link TreeSpecEditorAdapter.getVersion} for
 * host info panels (e.g. scenario id, version label, timestamps).
 */
export interface GraphEditorVersionInfo {
    scenarioId: string;
    versionId: string;
    /** Display name (e.g. scenario title or version label). */
    name: string;
    createdAt: string | null;
    updatedAt: string | null;
}

/**
 * Data-only adapter consumed by {@link useTreeSpecEditor}. Hosts pass an
 * object satisfying this contract; the hook never reads or writes routing,
 * URLs, or page chrome through it. Host pages may extend this adapter with
 * extra methods (e.g. `getPreviewUrl`, `getBackUrl`) for their own use —
 * those methods are not part of the hook contract.
 *
 * Every method except `getVersion` and `updateVersion` is optional; the hook
 * gates the corresponding feature (Validate / Publish / Snapshots / Audit /
 * Clone) on its presence.
 */
export interface TreeSpecEditorAdapter {
    /**
     * Load the current TreeSpec wire and published flag for an entity.
     * Returning `null` makes the hook surface a "failed to load" state.
     */
    getVersion: (
        entityId: string
    ) => Promise<{
        tree_spec: Record<string, unknown>;
        is_published: boolean;
        info?: GraphEditorVersionInfo;
    } | null>;
    /** Persist the current TreeSpec wire (called by Save Draft + autosave). */
    updateVersion: (entityId: string, payload: { tree_spec: Record<string, unknown> }) => Promise<void>;
    /**
     * Optional server-side validation. When absent, Validate becomes a local
     * (lint-only) operation and the toolbar should hide the Validate button.
     */
    validate?: (
        entityId: string,
        tree_spec: Record<string, unknown>
    ) => Promise<{ valid: boolean; issues?: AdapterValidationIssue[] }>;
    /** Optional publish. When absent, Publish is unavailable. */
    publish?: (entityId: string) => Promise<void>;
    /** Optional snapshot listing. When absent, Draft history is unavailable. */
    listSnapshots?: (entityId: string) => Promise<TreeSpecSnapshotItem[]>;
    /** Optional snapshot restore. */
    restoreSnapshot?: (
        entityId: string,
        snapshotId: string
    ) => Promise<{ tree_spec: Record<string, unknown> }>;
    /** Optional manual snapshot creation. */
    createSnapshot?: (
        entityId: string,
        payload: { label?: string; tree_spec: Record<string, unknown> }
    ) => Promise<void>;
    /**
     * Optional clone-to-draft. Returns the id of the newly created draft.
     * When absent, Clone is unavailable.
     */
    cloneToDraft?: (entityId: string) => Promise<{ id: string }>;
    /** Optional audit listing. When absent, Audit is unavailable. */
    listAudit?: (entityId: string) => Promise<TreeSpecAuditEventItem[]>;
}

/**
 * Adapter-shaped validation issue. Hosts that surface server validation should
 * normalize their backend payload to this shape inside the adapter — the hook
 * then maps it into the standard {@link TreeSpecIssue}.
 */
export interface AdapterValidationIssue {
    severity?: 'error' | 'warning' | 'info';
    level?: string;
    message?: string;
    node_id?: string;
    choice_id?: string;
}

/**
 * Input options for {@link useTreeSpecEditor}. Only `adapter` and `entityId`
 * are required; everything else is opt-in.
 */
export interface UseTreeSpecEditorOptions {
    /** Data adapter for the editor (see {@link TreeSpecEditorAdapter}). */
    adapter: TreeSpecEditorAdapter;
    /**
     * Stable identifier for the entity being edited (host extracts from its
     * router, e.g. `useParams().scenarioVersionId`). `undefined` puts the
     * hook in a loading-without-target state until a value is supplied.
     */
    entityId: string | undefined;
    /**
     * Autosave debounce delay in milliseconds. Default `2500`.
     * Ignored when {@link enableAutosave} is `false`.
     */
    autosaveDebounceMs?: number;
    /** Enable/disable autosave entirely. Default `true`. */
    enableAutosave?: boolean;
    /** Enable/disable the global keyboard shortcut listener. Default `true`. */
    enableKeyboardShortcuts?: boolean;
    /**
     * Coerce the raw `tree_spec` payload returned by the adapter into a
     * `TreeSpecWire`. Defaults to {@link coerceTreeSpecWireForEditor} from
     * `@signalsafe/tree-spec-editor-core`, which passes valid wires through
     * and bootstraps a starter graph for `null`/`undefined`/empty payloads.
     * Override to change the bootstrap behavior (e.g. ship a richer template,
     * or refuse to bootstrap).
     */
    coerceRawSpec?: (raw: unknown) => TreeSpecWire | null;
    /**
     * Optional computation of runtime issues from the compiled TreeSpec.
     * Hosts that integrate with the simulator pass
     * `treeSpecRuntimeIssues` from `@signalsafe/simulator-core`. Hosts that
     * don't can omit this; runtime issues will be an empty array.
     * The hook itself never imports the simulator package.
     */
    computeRuntimeIssues?: (compiled: Record<string, unknown>) => TreeSpecIssue[];
    /**
     * When `true`, the runtime-issue category is folded into the developer
     * tools surface rather than appearing in the dedup'd `issues` list. Host
     * supplies this from its debug-mode toggle. Default `false`.
     */
    debugMode?: boolean;
    /**
     * Invoked when the user triggers the Preview action (toolbar button or
     * `Ctrl/Cmd+P` keyboard shortcut). Hosts wire their router here.
     */
    onPreview?: () => void;
    /**
     * Invoked after a successful `cloneToDraft` with the new draft id. Hosts
     * wire their router here.
     */
    onCloneNavigate?: (newDraftId: string) => void;
    /**
     * Optional parser for backend validation errors that arrive as a single
     * detail string (e.g. Pydantic outcome errors). Defaults to
     * {@link parsePydanticOutcomeErrors} from
     * `@signalsafe/tree-spec-editor-core`.
     */
    parseServerErrorMessage?: (message: string) => TreeSpecIssue[] | null;
    /**
     * Decide whether the hook should auto-validate on initial load. Defaults
     * to {@link shouldQueueInitialValidation} from
     * `@signalsafe/tree-spec-editor-core` (validates drafts, skips published).
     */
    shouldQueueInitialValidation?: (isPublished: boolean | undefined) => boolean;
}

/** Mutable editor state surfaced by {@link useTreeSpecEditor}. */
export interface UseTreeSpecEditorState {
    /** Loading the entity from the adapter. `true` until first load resolves or rejects. */
    loading: boolean;
    /** A `Save Draft` round-trip is in flight. */
    saving: boolean;
    /** A `Publish` round-trip is in flight. */
    publishing: boolean;
    /** A `Snapshot` round-trip is in flight. */
    creatingSnapshot: boolean;
    /** A `Clone to Draft` round-trip is in flight. */
    cloning: boolean;
    /** Id of the snapshot currently being restored, or `null`. */
    restoringSnapshotId: string | null;
    /** Autosave state machine snapshot. */
    autosaveStatus: AutosaveStatus;
    /** ISO timestamp of the most recent validation, or `null`. */
    lastValidatedAt: string | null;

    /** The most recent raw wire from the adapter (or the last successful save). */
    rawTreeSpec: TreeSpecWire | null;
    /** Editor-shaped tree derived from `rawTreeSpec` plus user edits. */
    tree: EditorTree | null;
    /**
     * Decompiled `rawTreeSpec` — used by the Publish modal to diff against the
     * current `tree`. `null` until the initial load resolves.
     */
    baselineTree: EditorTree | null;
    /** Compiled `tree`, or `null` when `tree` is `null`. Memoized. */
    compiledTreeSpec: TreeSpecWire | null;
    /** Whether the loaded entity is published (read-only). */
    isPublished: boolean;
    /**
     * Optional version/scenario metadata from {@link TreeSpecEditorAdapter.getVersion}
     * (e.g. for an info panel). `null` when absent or not yet loaded.
     */
    versionInfo: GraphEditorVersionInfo | null;
    /** Convenience: `Boolean(tree)`. */
    hasTree: boolean;

    /** Local lint issues (editor + wire) — recomputed on every tree change. */
    localIssues: TreeSpecIssue[];
    /** Server validation issues — populated by `actions.validate`. */
    serverIssues: TreeSpecIssue[];
    /**
     * Runtime issues from {@link UseTreeSpecEditorOptions.computeRuntimeIssues}
     * (empty when no callback is wired).
     */
    runtimeIssues: TreeSpecIssue[];
    /** Dedup'd union of `localIssues`, `serverIssues`, and `runtimeIssues`. */
    issues: TreeSpecIssue[];
    /** `true` when `issues` contains no error-severity entries. */
    canPublish: boolean;

    /** Current graph selection (node, edge, or none). */
    selection: GraphSelection;
    /** Node the canvas should focus into view (e.g. after add/duplicate). */
    focusNodeId: string | null;
    /** Choice within the focused node to scroll into view. */
    focusChoiceId: string | null;
    /** Bump-counter the canvas watches to trigger `fitView`. */
    fitViewNonce: number;
    /** Node object for `selection` when it's a NODE selection; `null` otherwise. */
    selectedNode: EditorNode | null;
    /** Transition object for `selection` when it's an EDGE selection; `null` otherwise. */
    selectedEdge: EditorTransition | null;
    /** Node shown in the inspector (selected node, or edge source node). */
    inspectorNode: EditorNode | null;

    /** Search filter for the Nodes panel. */
    nodeSearch: string;
    /** Search filter for the Issues panel. */
    issueSearch: string;
    /** Whether the canvas mini-map is visible. */
    showMiniMap: boolean;
    /** Snapshot list (loaded when `showDraftHistory` opens). */
    snapshots: TreeSpecSnapshotItem[];
    /** Audit event list (loaded when `showAudit` opens). */
    auditEvents: TreeSpecAuditEventItem[];
    /** Fetching the snapshot list. */
    loadingSnapshots: boolean;
    /** Fetching the audit event list. */
    loadingAudit: boolean;
    /** Draft-history modal visibility. */
    showDraftHistory: boolean;
    /** Audit modal visibility. */
    showAudit: boolean;
    /** Publish-review modal visibility. */
    showPublishModal: boolean;
    /** Whether undo (Ctrl/Cmd+Z) is available for the current draft. */
    canUndo: boolean;
    /** Whether redo (Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y) is available. */
    canRedo: boolean;
    /** Whether a node was copied and paste (Ctrl/Cmd+V) can run. */
    hasCopiedNode: boolean;
}

/** Actions surfaced by {@link useTreeSpecEditor}. */
export interface UseTreeSpecEditorActions {
    /** Replace the entire tree (e.g. after the canvas emits a change). */
    setTree: (next: EditorTree | null) => void;
    /** Replace the current selection. Clears choice focus when selecting a node or clearing selection. */
    setSelection: (next: GraphSelection) => void;
    /** Select a choice on the canvas: keeps the parent node selected and focuses the choice. */
    selectChoice: (nodeId: string, choiceId: string) => void;
    /** Replace the node-focus marker. */
    setFocusNodeId: (id: string | null) => void;
    /** Replace the choice-focus marker. */
    setFocusChoiceId: (id: string | null) => void;
    /** Bump the fitView nonce (e.g. for a "Reset view" button). */
    triggerResetView: () => void;
    /** Update the Nodes-panel search filter. */
    setNodeSearch: (next: string) => void;
    /** Update the Issues-panel search filter. */
    setIssueSearch: (next: string) => void;
    /** Toggle the canvas mini-map. */
    setShowMiniMap: (next: boolean) => void;
    /** Show/hide the draft-history modal. */
    setShowDraftHistory: (next: boolean) => void;
    /** Show/hide the audit modal. */
    setShowAudit: (next: boolean) => void;
    /** Show/hide the publish-review modal. */
    setShowPublishModal: (next: boolean) => void;

    /**
     * Spawn a new node of the supplied type (host owns the type vocabulary).
     * Returns the id of the spawned node, or `undefined` when no tree is loaded.
     */
    addNodeOfType: (type: string, patch?: Partial<EditorNode>) => string | undefined;
    /**
     * Remove the currently selected node (same semantics as the Delete keyboard shortcut).
     * Returns `true` when a node was removed. No-op (returns `false`) when there is no tree,
     * nothing is selected, the selection is not a node, the version is published, or delete is
     * not allowed for that node.
     */
    deleteSelectedNode: () => boolean;
    /**
     * Remove a node by id (clears selection / focus when they pointed at that node).
     * Returns `true` when the node was removed. No-op when there is no tree, the version is
     * published, or `deleteNode` refuses (e.g. invalid id).
     */
    deleteNodeById: (nodeId: string) => boolean;
    /** Run the auto-layout helper and bump the fitView nonce. */
    autoLayout: () => void;
    /** Apply a starter template (host owns the template vocabulary). */
    insertTemplate: (spec: TreeTemplateSpec) => void;

    /**
     * Run server-side validation if the adapter supports it; otherwise just
     * stamp `lastValidatedAt`. Pass an explicit wire to validate something
     * other than the current `tree`. Returns the adapter's payload, or
     * `{ valid: false, issues }` when the call rejected.
     */
    validate: (specOverride?: TreeSpecWire) =>
        Promise<{ valid: boolean; issues?: AdapterValidationIssue[] } | undefined>;
    /** Save the current draft via the adapter. No-op when published or loading. */
    saveDraft: () => Promise<void>;
    /**
     * Validate then publish. Surfaces validation errors via `serverIssues`
     * and refuses to publish when `canPublish` is `false`.
     */
    publish: () => Promise<void>;

    /** Create a snapshot of the current tree via the adapter. */
    createSnapshot: () => Promise<void>;
    /** Restore the tree to a snapshot via the adapter; clears local edits. */
    restoreSnapshot: (snapshotId: string) => Promise<void>;
    /**
     * Clone the current entity to a new draft via the adapter and invoke
     * {@link UseTreeSpecEditorOptions.onCloneNavigate} when the new id arrives.
     */
    cloneToDraft: () => Promise<void>;

    /** Patch the currently-selected node. No-op when no node is selected. */
    updateSelectedNode: (patch: Partial<EditorNode>) => void;
    /** Append a new (empty) choice to the currently-selected node. */
    addChoice: () => void;
    /** Change a choice's stable type id (updates transitions). */
    setChoiceType: (choiceId: string, typeId: string, defaultLabel?: string) => void;
    /** Remove a choice from the selected node (and its outgoing transitions). */
    deleteChoice: (choiceId: string) => void;
    /** Move a choice up or down within the selected node's choice list. */
    moveChoice: (choiceId: string, direction: 'up' | 'down') => void;
    /** Drag-drop reposition: reorder within a node or move to another node. */
    repositionChoice: (
        fromNodeId: string,
        choiceId: string,
        toNodeId: string,
        toIndex: number,
    ) => void;
    /** Re-target a choice's transition (creates the transition if missing). */
    setChoiceTarget: (choiceId: string, targetNodeId: string) => void;
    /** Update the terminal outcome of a choice targeting the END node. */
    setChoiceOutcome: (choiceId: string, outcome: string) => void;
    /** Patch canvas-only edge appearance hints on any node's choice. */
    updateChoiceEdgeHints: (nodeId: string, choiceId: string, patch: Partial<ChoiceEdgeHints>) => void;
    /** Set the scenario-level default edge routing type. */
    setDefaultEdgeType: (edgeType: GraphEditorEdgeType) => void;

    /**
     * Click an issue from the Issues panel: focuses the issue's node + choice,
     * selects the node, and bumps the fitView nonce.
     */
    selectIssue: (issue: { node_id?: string; choice_id?: string }) => void;
    /** Undo the most recent tree edit. Returns `true` when a step was restored. */
    undo: () => boolean;
    /** Redo the most recently undone edit. Returns `true` when a step was restored. */
    redo: () => boolean;
    /** Copy the selected node for paste. Returns `true` when a node was copied. */
    copySelectedNode: () => boolean;
    /** Paste the copied node as a duplicate. Returns `true` when paste succeeded. */
    pasteCopiedNode: () => boolean;
    /** Duplicate a node by id (same semantics as Ctrl/Cmd+D). Returns the new node id. */
    duplicateNodeById: (nodeId: string) => string | undefined;
}

/** Return value of {@link useTreeSpecEditor}. */
export interface UseTreeSpecEditorResult extends UseTreeSpecEditorState {
    actions: UseTreeSpecEditorActions;
}

/**
 * Map of keyboard shortcut actions the hook handled most recently. Test-only
 * surface; not part of the public API.
 * @internal
 */
export type DispatchedKeyboardAction = KeyboardShortcutAction | null;

export type { EditorChoice, EditorNode, EditorTransition, EditorTree } from '@signalsafe/tree-spec-editor-core';
