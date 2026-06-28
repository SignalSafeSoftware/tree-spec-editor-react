import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type RefObject } from 'react';

import {
    compileTreeSpec,
    decompileTreeSpec,
    lintTreeSpecWire,
    TREE_SPEC_ISSUE_SEVERITY,
    type TreeSpecIssue,
    type TreeSpecWire,
} from '@signalsafe/tree-spec';

import {
    autoLayoutTree,
    AUTOSAVE_STATUS,
    coerceTreeSpecWireForEditor as defaultCoerceRawSpec,
    needsInitialLayout,
    lintEditorTree,
    parsePydanticOutcomeErrors as defaultParseServerErrorMessage,
    shouldQueueInitialValidation as defaultShouldQueueInitialValidation,
    type AutosaveStatus,
    type EditorTree,
    type TreeSpecAuditEventItem,
    type TreeSpecSnapshotItem,
} from '@signalsafe/tree-spec-editor-core';

import type {
    AdapterValidationIssue,
    GraphEditorVersionInfo,
    UseTreeSpecEditorActions,
    UseTreeSpecEditorOptions,
} from './types.js';

export type UseEditorAdapterOptions = {
    options: UseTreeSpecEditorOptions;
    tree: EditorTree | null;
    isPublished: boolean;
    setIsPublished: (next: boolean) => void;
    replaceTreeWithoutHistory: (next: EditorTree | null) => void;
    lastSavedKeyRef: MutableRefObject<string>;
    setAutosaveStatus: (status: AutosaveStatus) => void;
};

export type UseEditorAdapterResult = {
    loading: boolean;
    saving: boolean;
    publishing: boolean;
    setPublishing: (next: boolean) => void;
    creatingSnapshot: boolean;
    cloning: boolean;
    restoringSnapshotId: string | null;
    lastValidatedAt: string | null;
    rawTreeSpec: TreeSpecWire | null;
    versionInfo: GraphEditorVersionInfo | null;
    localIssues: TreeSpecIssue[];
    serverIssues: TreeSpecIssue[];
    snapshots: TreeSpecSnapshotItem[];
    auditEvents: TreeSpecAuditEventItem[];
    loadingSnapshots: boolean;
    loadingAudit: boolean;
    showDraftHistory: boolean;
    setShowDraftHistory: (next: boolean) => void;
    showAudit: boolean;
    setShowAudit: (next: boolean) => void;
    showPublishModal: boolean;
    setShowPublishModal: (next: boolean) => void;
    validate: UseTreeSpecEditorActions['validate'];
    saveDraft: UseTreeSpecEditorActions['saveDraft'];
    createSnapshot: UseTreeSpecEditorActions['createSnapshot'];
    restoreSnapshot: UseTreeSpecEditorActions['restoreSnapshot'];
    cloneToDraft: UseTreeSpecEditorActions['cloneToDraft'];
    validateRef: RefObject<UseTreeSpecEditorActions['validate']>;
    saveDraftRef: RefObject<UseTreeSpecEditorActions['saveDraft']>;
};

export function useEditorAdapter(adapterOptions: UseEditorAdapterOptions): UseEditorAdapterResult {
    const {
        options,
        tree,
        isPublished,
        setIsPublished,
        replaceTreeWithoutHistory,
        lastSavedKeyRef,
        setAutosaveStatus,
    } = adapterOptions;

    const {
        adapter,
        entityId,
        coerceRawSpec = defaultCoerceRawSpec,
        onCloneNavigate,
        parseServerErrorMessage = defaultParseServerErrorMessage,
        shouldQueueInitialValidation = defaultShouldQueueInitialValidation,
    } = options;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [rawTreeSpec, setRawTreeSpec] = useState<TreeSpecWire | null>(null);
    const [versionInfo, setVersionInfo] = useState<GraphEditorVersionInfo | null>(null);
    const [localIssues, setLocalIssues] = useState<TreeSpecIssue[]>([]);
    const [serverIssues, setServerIssues] = useState<TreeSpecIssue[]>([]);
    const [lastValidatedAt, setLastValidatedAt] = useState<string | null>(null);

    const [showDraftHistory, setShowDraftHistory] = useState(false);
    const [showAudit, setShowAudit] = useState(false);
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [snapshots, setSnapshots] = useState<TreeSpecSnapshotItem[]>([]);
    const [auditEvents, setAuditEvents] = useState<TreeSpecAuditEventItem[]>([]);
    const [loadingSnapshots, setLoadingSnapshots] = useState(false);
    const [loadingAudit, setLoadingAudit] = useState(false);
    const [restoringSnapshotId, setRestoringSnapshotId] = useState<string | null>(null);
    const [creatingSnapshot, setCreatingSnapshot] = useState(false);
    const [cloning, setCloning] = useState(false);

    const validateRef = useRef<UseTreeSpecEditorActions['validate']>(async () => undefined);
    const saveDraftRef = useRef<UseTreeSpecEditorActions['saveDraft']>(async () => undefined);

    const compiledTreeSpec = useMemo(
        () => (tree ? compileTreeSpec(tree) : null),
        [tree],
    );

    useEffect(() => {
        let cancelled = false;
        async function load() {
            if (!entityId) return;
            setLoading(true);
            setVersionInfo(null);
            try {
                const raw = await adapter.getVersion(entityId);
                if (cancelled) return;
                setIsPublished(Boolean(raw?.is_published));
                setVersionInfo(raw?.info ?? null);
                const rawSpec = raw?.tree_spec;
                const spec = coerceRawSpec(rawSpec);
                if (spec == null) {
                    setRawTreeSpec(null);
                    replaceTreeWithoutHistory(null);
                    setVersionInfo(raw?.info ?? null);
                } else {
                    setRawTreeSpec(spec);
                    let nextTree = decompileTreeSpec(spec);
                    if (needsInitialLayout(nextTree)) {
                        nextTree = autoLayoutTree(nextTree);
                    }
                    replaceTreeWithoutHistory(nextTree);
                    setLocalIssues([...lintTreeSpecWire(spec), ...lintEditorTree(nextTree)]);
                    if (shouldQueueInitialValidation(raw?.is_published)) {
                        queueMicrotask(() => {
                            void validateRef.current(spec);
                        });
                    }
                    lastSavedKeyRef.current = JSON.stringify(spec);
                    setAutosaveStatus(AUTOSAVE_STATUS.IDLE);
                }
            } catch {
                if (cancelled) return;
                setRawTreeSpec(null);
                replaceTreeWithoutHistory(null);
                setVersionInfo(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        if (entityId) void load();
        return () => {
            cancelled = true;
        };
    }, [
        entityId,
        adapter,
        coerceRawSpec,
        shouldQueueInitialValidation,
        replaceTreeWithoutHistory,
        lastSavedKeyRef,
        setAutosaveStatus,
        setIsPublished,
    ]);

    useEffect(() => {
        if (!tree || !compiledTreeSpec) return;
        setLocalIssues([...lintTreeSpecWire(compiledTreeSpec), ...lintEditorTree(tree)]);
    }, [tree, compiledTreeSpec]);

    const validate = useCallback<UseTreeSpecEditorActions['validate']>(
        async (specOverride) => {
            if (!entityId) return undefined;
            const spec = specOverride ?? (tree ? compileTreeSpec(tree) : rawTreeSpec);
            if (!spec) return undefined;
            if (!adapter.validate) {
                setLastValidatedAt(new Date().toISOString());
                return { valid: true };
            }
            try {
                const payload = await adapter.validate(entityId, spec);
                const nextIssues: TreeSpecIssue[] = (payload?.issues ?? []).map(
                    (i: AdapterValidationIssue) => {
                        const severity: TreeSpecIssue['severity'] =
                            i.severity ?? (i.level as TreeSpecIssue['severity']) ?? TREE_SPEC_ISSUE_SEVERITY.ERROR;
                        return {
                            severity,
                            message: String(i.message ?? 'Issue'),
                            node_id: i.node_id ?? undefined,
                            choice_id: i.choice_id ?? undefined,
                        };
                    },
                );
                setServerIssues(nextIssues);
                setLastValidatedAt(new Date().toISOString());
                return payload;
            } catch (err: unknown) {
                const ex = err as { response?: { data?: Record<string, unknown> }; message?: string };
                const errData = ex?.response?.data;
                const msg =
                    (errData?.detail as string | undefined) ??
                    (errData?.error as string | undefined) ??
                    (err as Error)?.message ??
                    'Validation failed';
                const parsed = parseServerErrorMessage(String(msg));
                setServerIssues(
                    parsed ?? [{ severity: TREE_SPEC_ISSUE_SEVERITY.ERROR, message: String(msg) }],
                );
                setLastValidatedAt(new Date().toISOString());
                return {
                    valid: false,
                    issues: [{ severity: TREE_SPEC_ISSUE_SEVERITY.ERROR, message: String(msg) }],
                };
            }
        },
        [adapter, entityId, parseServerErrorMessage, rawTreeSpec, tree],
    );

    useEffect(() => {
        validateRef.current = validate;
    }, [validate]);

    const saveDraft = useCallback<UseTreeSpecEditorActions['saveDraft']>(async () => {
        if (!entityId || !tree) return;
        if (isPublished) return;
        setSaving(true);
        setAutosaveStatus(AUTOSAVE_STATUS.SAVING);
        try {
            const compiled = compileTreeSpec(tree);
            await adapter.updateVersion(entityId, { tree_spec: compiled });
            setRawTreeSpec(compiled);
            lastSavedKeyRef.current = JSON.stringify(compiled);
            setAutosaveStatus(AUTOSAVE_STATUS.SAVED);
        } finally {
            setSaving(false);
        }
    }, [adapter, entityId, isPublished, tree, lastSavedKeyRef, setAutosaveStatus]);

    useEffect(() => {
        saveDraftRef.current = saveDraft;
    }, [saveDraft]);

    useEffect(() => {
        const listSnapshots = adapter.listSnapshots;
        if (!listSnapshots || !showDraftHistory || !entityId) return;
        let cancelled = false;
        setLoadingSnapshots(true);
        void (async () => {
            try {
                const list = await listSnapshots(entityId);
                if (!cancelled) setSnapshots(list);
            } finally {
                if (!cancelled) setLoadingSnapshots(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [adapter, showDraftHistory, entityId]);

    const createSnapshot = useCallback<UseTreeSpecEditorActions['createSnapshot']>(async () => {
        if (!entityId || !tree || !adapter.createSnapshot || !adapter.listSnapshots) return;
        setCreatingSnapshot(true);
        try {
            const compiled = compileTreeSpec(tree) as Record<string, unknown>;
            await adapter.createSnapshot(entityId, { label: '', tree_spec: compiled });
            const list = await adapter.listSnapshots(entityId);
            setSnapshots(list);
        } finally {
            setCreatingSnapshot(false);
        }
    }, [adapter, entityId, tree]);

    const restoreSnapshot = useCallback<UseTreeSpecEditorActions['restoreSnapshot']>(
        async (snapshotId) => {
            if (!entityId || !adapter.restoreSnapshot) return;
            setRestoringSnapshotId(snapshotId);
            try {
                const { tree_spec: rawSpec } = await adapter.restoreSnapshot(entityId, snapshotId);
                const spec = coerceRawSpec(rawSpec);
                if (spec != null) {
                    setRawTreeSpec(spec);
                    replaceTreeWithoutHistory(decompileTreeSpec(spec));
                    lastSavedKeyRef.current = JSON.stringify(spec);
                    setAutosaveStatus(AUTOSAVE_STATUS.IDLE);
                }
                setShowDraftHistory(false);
            } finally {
                setRestoringSnapshotId(null);
            }
        },
        [adapter, coerceRawSpec, entityId, replaceTreeWithoutHistory, lastSavedKeyRef, setAutosaveStatus],
    );

    useEffect(() => {
        const listAudit = adapter.listAudit;
        if (!listAudit || !showAudit || !entityId) return;
        let cancelled = false;
        setLoadingAudit(true);
        void (async () => {
            try {
                const list = await listAudit(entityId);
                if (!cancelled) setAuditEvents(list);
            } finally {
                if (!cancelled) setLoadingAudit(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [adapter, showAudit, entityId]);

    const cloneToDraft = useCallback<UseTreeSpecEditorActions['cloneToDraft']>(async () => {
        if (!entityId || !adapter.cloneToDraft) return;
        setCloning(true);
        try {
            const { id: newId } = await adapter.cloneToDraft(entityId);
            if (newId) onCloneNavigate?.(newId);
        } finally {
            setCloning(false);
        }
    }, [adapter, entityId, onCloneNavigate]);

    return {
        loading,
        saving,
        publishing,
        setPublishing,
        creatingSnapshot,
        cloning,
        restoringSnapshotId,
        lastValidatedAt,
        rawTreeSpec,
        versionInfo,
        localIssues,
        serverIssues,
        snapshots,
        auditEvents,
        loadingSnapshots,
        loadingAudit,
        showDraftHistory,
        setShowDraftHistory,
        showAudit,
        setShowAudit,
        showPublishModal,
        setShowPublishModal,
        validate,
        saveDraft,
        createSnapshot,
        restoreSnapshot,
        cloneToDraft,
        validateRef,
        saveDraftRef,
    };
}
