import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestRenderer, act } from '../reactTestRenderer';

import { useTreeSpecEditor } from '../../src/hooks/useTreeSpecEditor';
import type {
    TreeSpecEditorAdapter,
    UseTreeSpecEditorOptions,
    UseTreeSpecEditorResult,
} from '../../src/hooks/types';
import * as treeSpec from '@signalsafe/tree-spec';
import {
    AUTOSAVE_STATUS,
    END_NODE_ID,
    GRAPH_SELECTION_KIND,
    type TreeTemplateSpec,
} from '@signalsafe/tree-spec-editor-core';

/**
 * Minimal valid TreeSpec wire used by the load tests. The hook decompiles this
 * into an EditorTree on initial load.
 */
function buildSampleWire(): Record<string, unknown> {
    return {
        wire_version: 1,
        start_node: 'n1',
        nodes: {
            n1: { type: 'prompt', prompt: 'Pick one', choices: [{ id: 'c1', label: 'A' }] },
        },
        transitions: [],
    };
}

/** Test harness: renders the hook and exposes its result on a ref. */
type LatestResultRef = { current: UseTreeSpecEditorResult | null };

function Harness({
    options,
    latestRef,
}: {
    options: UseTreeSpecEditorOptions;
    latestRef: LatestResultRef;
}) {
    const result = useTreeSpecEditor(options);
    latestRef.current = result;
    return null;
}

async function mountHook(options: UseTreeSpecEditorOptions): Promise<{
    latest: LatestResultRef;
    rerender: (next: UseTreeSpecEditorOptions) => Promise<void>;
    unmount: () => void;
}> {
    const latest: LatestResultRef = { current: null };
    let root: ReturnType<typeof TestRenderer.create> | null = null;
    await act(async () => {
        root = TestRenderer.create(React.createElement(Harness, { options, latestRef: latest }));
    });
    const liveRoot = root as unknown as ReturnType<typeof TestRenderer.create>;
    return {
        latest,
        rerender: async (next) => {
            await act(async () => {
                liveRoot.update(React.createElement(Harness, { options: next, latestRef: latest }));
            });
        },
        unmount: () => liveRoot.unmount(),
    };
}

function buildAdapter(overrides: Partial<TreeSpecEditorAdapter> = {}): TreeSpecEditorAdapter {
    return {
        getVersion: vi.fn(async () => ({ tree_spec: buildSampleWire(), is_published: false })),
        updateVersion: vi.fn(async () => {}),
        ...overrides,
    };
}

describe('useTreeSpecEditor', () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('initial load', () => {
        it('loads the entity, decompiles into a tree, and clears loading', async () => {
            const adapter = buildAdapter();
            const { latest } = await mountHook({ adapter, entityId: 'v1' });

            expect(latest.current?.loading).toBe(false);
            expect(latest.current?.tree?.nodes.n1?.prompt).toBe('Pick one');
            expect(latest.current?.isPublished).toBe(false);
            expect(latest.current?.autosaveStatus).toBe(AUTOSAVE_STATUS.IDLE);
            expect(latest.current?.hasTree).toBe(true);
            expect(latest.current?.versionInfo).toBeNull();
            expect(adapter.getVersion).toHaveBeenCalledWith('v1');
        });

        it('auto-layouts on load when nodes have no saved positions', async () => {
            const wire = {
                wire_version: 1,
                start_node: 'n1',
                nodes: {
                    n1: { type: 'prompt', prompt: 'A', choices: [{ id: 'c1', label: 'Go' }] },
                    n2: { type: 'prompt', prompt: 'B', choices: [] },
                },
                transitions: [{ from: ['n1', 'c1'], to: 'n2' }],
            };
            const adapter = buildAdapter({
                getVersion: vi.fn(async () => ({ tree_spec: wire, is_published: false })),
            });
            const { latest } = await mountHook({ adapter, entityId: 'v1' });

            expect(latest.current?.tree?.nodes.n1?.position).not.toEqual({ x: 0, y: 0 });
            expect(latest.current?.tree?.nodes.n2?.position).not.toEqual({ x: 0, y: 0 });
        });

        it('exposes issueSearch and setIssueSearch', async () => {
            const adapter = buildAdapter();
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            expect(latest.current?.issueSearch).toBe('');
            await act(async () => {
                latest.current?.actions.setIssueSearch('lint');
            });
            expect(latest.current?.issueSearch).toBe('lint');
        });

        it('exposes baselineTree derived from the loaded raw wire', async () => {
            const adapter = buildAdapter();
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            expect(latest.current?.baselineTree?.nodes.n1).toBeDefined();
        });

        it('sets versionInfo when getVersion returns info', async () => {
            const adapter = buildAdapter({
                getVersion: vi.fn(async () => ({
                    tree_spec: buildSampleWire(),
                    is_published: false,
                    info: {
                        scenarioId: 'sc-1',
                        versionId: 'v1',
                        name: 'Test scenario',
                        createdAt: '2020-01-01T00:00:00.000Z',
                        updatedAt: '2020-01-02T00:00:00.000Z',
                    },
                })),
            });
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            expect(latest.current?.versionInfo).toEqual({
                scenarioId: 'sc-1',
                versionId: 'v1',
                name: 'Test scenario',
                createdAt: '2020-01-01T00:00:00.000Z',
                updatedAt: '2020-01-02T00:00:00.000Z',
            });
        });

        it('reflects published flag and skips initial validation when published', async () => {
            const adapter = buildAdapter({
                getVersion: vi.fn(async () => ({ tree_spec: buildSampleWire(), is_published: true })),
                validate: vi.fn(async () => ({ valid: true, issues: [] })),
            });
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            expect(latest.current?.isPublished).toBe(true);
            expect(adapter.validate).not.toHaveBeenCalled();
        });

        it('runs the initial validation pass for drafts when adapter.validate exists', async () => {
            const validate = vi.fn(async () => ({ valid: true, issues: [] }));
            const adapter = buildAdapter({ validate });
            await mountHook({ adapter, entityId: 'v1' });
            // microtask scheduling — flush by yielding
            await act(async () => {
                await new Promise((r) => setTimeout(r, 0));
            });
            expect(validate).toHaveBeenCalledTimes(1);
        });

        it('bootstraps a starter graph when getVersion returns null (default coerce behavior)', async () => {
            const adapter = buildAdapter({
                getVersion: vi.fn(async () => null),
            });
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            // Default coerceRawSpec turns undefined/null/{} into a starter wire,
            // so a null adapter response lands on a usable empty tree, not a
            // failed-to-load state.
            expect(latest.current?.tree).not.toBeNull();
            expect(latest.current?.loading).toBe(false);
        });

        it('surfaces a failed-to-load state when coerceRawSpec rejects the payload', async () => {
            const adapter = buildAdapter({
                getVersion: vi.fn(async () => ({
                    tree_spec: { not_a_wire: true },
                    is_published: false,
                })),
            });
            const { latest } = await mountHook({
                adapter,
                entityId: 'v1',
                // Use the default coerce; { not_a_wire: true } is not empty
                // and not a valid wire, so it returns null.
            });
            expect(latest.current?.tree).toBeNull();
            expect(latest.current?.rawTreeSpec).toBeNull();
            expect(latest.current?.loading).toBe(false);
        });

        it('surfaces a failed-to-load state when getVersion rejects', async () => {
            const adapter = buildAdapter({
                getVersion: vi.fn(async () => {
                    throw new Error('boom');
                }),
            });
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            expect(latest.current?.tree).toBeNull();
            expect(latest.current?.loading).toBe(false);
        });

        it('returns null baselineTree when decompile fails after rawTreeSpec changes', async () => {
            const adapter = buildAdapter();
            const realDecompile = treeSpec.decompileTreeSpec;
            let decompileCalls = 0;
            const decompileSpy = vi.spyOn(treeSpec, 'decompileTreeSpec').mockImplementation((wire) => {
                decompileCalls += 1;
                if (decompileCalls > 2) {
                    throw new Error('corrupt wire');
                }
                return realDecompile(wire);
            });
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            await act(async () => {
                await latest.current?.actions.saveDraft();
            });
            expect(latest.current?.baselineTree).toBeNull();
            decompileSpy.mockRestore();
        });

        it('stays in loading state when entityId is undefined', async () => {
            const adapter = buildAdapter();
            const { latest } = await mountHook({ adapter, entityId: undefined });
            expect(latest.current?.loading).toBe(true);
            expect(adapter.getVersion).not.toHaveBeenCalled();
        });

        it('excludes runtime issues from the merged issues list when debugMode is true', async () => {
            const runtimeIssue = {
                severity: 'warning' as const,
                message: 'Runtime-only issue',
                node_id: 'n1',
            };
            const adapter = buildAdapter();
            const { latest } = await mountHook({
                adapter,
                entityId: 'v1',
                debugMode: true,
                computeRuntimeIssues: () => [runtimeIssue],
            });

            expect(latest.current?.issues.some((issue) => issue.message === runtimeIssue.message)).toBe(false);
        });

        it('includes runtime issues in the merged issues list when debugMode is false', async () => {
            const runtimeIssue = {
                severity: 'warning' as const,
                message: 'Runtime-only issue',
                node_id: 'n1',
            };
            const adapter = buildAdapter();
            const { latest } = await mountHook({
                adapter,
                entityId: 'v1',
                computeRuntimeIssues: () => [runtimeIssue],
            });

            expect(latest.current?.issues.some((issue) => issue.message === runtimeIssue.message)).toBe(true);
        });
    });

    describe('validate', () => {
        it('without adapter.validate: stamps lastValidatedAt and returns valid:true', async () => {
            const adapter = buildAdapter();
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            const result = await act(async () => latest.current?.actions.validate());
            expect(result).toEqual({ valid: true });
            expect(latest.current?.lastValidatedAt).not.toBeNull();
        });

        it('with adapter.validate: surfaces returned issues on serverIssues', async () => {
            const adapter = buildAdapter({
                validate: vi.fn(async () => ({
                    valid: false,
                    issues: [
                        { severity: 'error', message: 'Missing outcome', node_id: 'n1', choice_id: 'c1' },
                    ],
                })),
            });
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            await act(async () => {
                await latest.current?.actions.validate();
            });
            expect(latest.current?.serverIssues).toHaveLength(1);
            expect(latest.current?.serverIssues[0]?.message).toBe('Missing outcome');
            expect(latest.current?.serverIssues[0]?.node_id).toBe('n1');
        });

        it('catches an adapter rejection and surfaces a single error issue', async () => {
            const adapter = buildAdapter({
                validate: vi.fn(async () => {
                    throw Object.assign(new Error('Validation failed'), {
                        response: { data: { detail: 'Validation failed' } },
                    });
                }),
            });
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            const result = await act(async () => latest.current?.actions.validate());
            expect(result?.valid).toBe(false);
            expect(latest.current?.serverIssues[0]?.severity).toBe('error');
        });

        it('uses response.error when detail is absent', async () => {
            const adapter = buildAdapter({
                validate: vi.fn(async () => {
                    throw { response: { data: { error: 'Bad payload' } } };
                }),
            });
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            await act(async () => {
                await latest.current?.actions.validate();
            });
            expect(latest.current?.serverIssues[0]?.message).toBe('Bad payload');
        });

        it('uses Error.message when response data has no detail or error', async () => {
            const adapter = buildAdapter({
                validate: vi.fn(async () => {
                    throw new Error('Network down');
                }),
            });
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            await act(async () => {
                await latest.current?.actions.validate();
            });
            expect(latest.current?.serverIssues[0]?.message).toBe('Network down');
        });

        it('falls back to a generic message for non-Error rejections', async () => {
            const adapter = buildAdapter({
                validate: vi.fn(async () => {
                    throw 'unexpected';
                }),
            });
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            await act(async () => {
                await latest.current?.actions.validate();
            });
            expect(latest.current?.serverIssues[0]?.message).toBe('Validation failed');
        });
    });

    describe('saveDraft + autosave', () => {
        it('saveDraft calls updateVersion with the compiled wire and transitions through saving→saved', async () => {
            const adapter = buildAdapter();
            const { latest } = await mountHook({ adapter, entityId: 'v1' });

            await act(async () => {
                await latest.current?.actions.saveDraft();
            });
            expect(adapter.updateVersion).toHaveBeenCalledTimes(1);
            expect(latest.current?.autosaveStatus).toBe(AUTOSAVE_STATUS.SAVED);
            expect(latest.current?.saving).toBe(false);
        });

        it('saveDraft is a no-op when published', async () => {
            const adapter = buildAdapter({
                getVersion: vi.fn(async () => ({ tree_spec: buildSampleWire(), is_published: true })),
            });
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            await act(async () => {
                await latest.current?.actions.saveDraft();
            });
            expect(adapter.updateVersion).not.toHaveBeenCalled();
        });

        it('autosave fires after the debounce when the tree changes', async () => {
            vi.useFakeTimers();
            const adapter = buildAdapter();
            const { latest } = await mountHook({
                adapter,
                entityId: 'v1',
                autosaveDebounceMs: 1000,
            });

            // Edit the tree
            await act(async () => {
                const tree = latest.current!.tree!;
                latest.current!.actions.setTree({
                    ...tree,
                    nodes: { ...tree.nodes, n1: { ...tree.nodes.n1!, prompt: 'Edited' } },
                });
            });
            expect(latest.current?.autosaveStatus).toBe(AUTOSAVE_STATUS.DIRTY);

            // Advance past debounce
            await act(async () => {
                vi.advanceTimersByTime(1100);
            });
            // Let queued microtasks settle
            await act(async () => {
                vi.useRealTimers();
                await new Promise((r) => setTimeout(r, 0));
            });

            expect(adapter.updateVersion).toHaveBeenCalledTimes(1);
            expect(latest.current?.autosaveStatus).toBe(AUTOSAVE_STATUS.SAVED);
        });

        it('autosave does not run when enableAutosave is false', async () => {
            vi.useFakeTimers();
            const adapter = buildAdapter();
            const { latest } = await mountHook({
                adapter,
                entityId: 'v1',
                enableAutosave: false,
                autosaveDebounceMs: 100,
            });

            await act(async () => {
                const tree = latest.current!.tree!;
                latest.current!.actions.setTree({ ...tree, nodes: { ...tree.nodes, n1: { ...tree.nodes.n1!, prompt: 'X' } } });
            });
            await act(async () => {
                vi.advanceTimersByTime(500);
            });
            expect(adapter.updateVersion).not.toHaveBeenCalled();
        });

        it('resets the autosave debounce timer when the tree changes again before save', async () => {
            vi.useFakeTimers();
            const adapter = buildAdapter();
            const { latest } = await mountHook({
                adapter,
                entityId: 'v1',
                autosaveDebounceMs: 1000,
            });

            const editTree = (prompt: string) => {
                const tree = latest.current!.tree!;
                latest.current!.actions.setTree({
                    ...tree,
                    nodes: { ...tree.nodes, n1: { ...tree.nodes.n1!, prompt } },
                });
            };

            await act(async () => {
                editTree('First edit');
            });
            await act(async () => {
                vi.advanceTimersByTime(500);
            });
            await act(async () => {
                editTree('Second edit');
            });
            await act(async () => {
                vi.advanceTimersByTime(500);
            });
            expect(adapter.updateVersion).not.toHaveBeenCalled();
            await act(async () => {
                vi.advanceTimersByTime(600);
            });
            await act(async () => {
                vi.useRealTimers();
                await new Promise((r) => setTimeout(r, 0));
            });
            expect(adapter.updateVersion).toHaveBeenCalledTimes(1);
        });
    });

    describe('publish', () => {
        it('validates and publishes when valid', async () => {
            const validate = vi.fn(async () => ({ valid: true, issues: [] }));
            const publish = vi.fn(async () => {});
            const adapter = buildAdapter({
                validate,
                publish,
                getVersion: vi.fn(async () => ({
                    tree_spec: {
                        ...buildSampleWire(),
                        transitions: [{ from: ['n1', 'c1'], to: END_NODE_ID, outcome: 'safe' }],
                    },
                    is_published: false,
                })),
            });
            const { latest } = await mountHook({ adapter, entityId: 'v1' });

            await act(async () => {
                await latest.current?.actions.publish();
            });
            expect(publish).toHaveBeenCalledWith('v1');
            expect(latest.current?.isPublished).toBe(true);
        });

        it('refuses to publish when validation fails', async () => {
            const validate = vi.fn(async () => ({
                valid: false,
                issues: [{ severity: 'error' as const, message: 'Bad' }],
            }));
            const publish = vi.fn(async () => {});
            const adapter = buildAdapter({ validate, publish });
            const { latest } = await mountHook({ adapter, entityId: 'v1' });

            await act(async () => {
                await latest.current?.actions.publish();
            });
            expect(publish).not.toHaveBeenCalled();
            expect(latest.current?.isPublished).toBe(false);
        });

        it('no-op when adapter.publish is missing', async () => {
            const adapter = buildAdapter();
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            await act(async () => {
                await latest.current?.actions.publish();
            });
            expect(latest.current?.isPublished).toBe(false);
        });
    });

    describe('snapshots', () => {
        it('lists snapshots when showDraftHistory becomes true', async () => {
            const listSnapshots = vi.fn(async () => [
                { id: 's1', label: 'first', created_on: '2025-01-01', spec_hash: 'h1' },
            ]);
            const adapter = buildAdapter({ listSnapshots });
            const { latest } = await mountHook({ adapter, entityId: 'v1' });

            await act(async () => {
                latest.current!.actions.setShowDraftHistory(true);
            });
            await act(async () => {
                await new Promise((r) => setTimeout(r, 0));
            });
            expect(listSnapshots).toHaveBeenCalledWith('v1');
            expect(latest.current?.snapshots).toHaveLength(1);
            expect(latest.current?.snapshots[0]?.id).toBe('s1');
        });

        it('createSnapshot calls adapter then refreshes the list', async () => {
            const list1 = [{ id: 'a', created_on: '2025-01-01', spec_hash: 'h1' }];
            const list2 = [...list1, { id: 'b', created_on: '2025-01-02', spec_hash: 'h2' }];
            const listSnapshots = vi
                .fn()
                .mockResolvedValueOnce(list2);
            const createSnapshot = vi.fn(async () => {});
            const adapter = buildAdapter({ listSnapshots, createSnapshot });
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            await act(async () => {
                await latest.current?.actions.createSnapshot();
            });
            expect(createSnapshot).toHaveBeenCalled();
            expect(latest.current?.snapshots).toHaveLength(2);
        });

        it('restoreSnapshot pulls the snapshot tree, resets state, and closes the modal', async () => {
            const restoredWire = {
                wire_version: 1,
                start_node: 'r1',
                nodes: { r1: { type: 'prompt', prompt: 'Restored', choices: [] as Array<{ id: string; label: string }> } },
                transitions: [],
            };
            const adapter = buildAdapter({
                listSnapshots: vi.fn(async () => []),
                restoreSnapshot: vi.fn(async () => ({ tree_spec: restoredWire })),
            });
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            await act(async () => {
                latest.current!.actions.setShowDraftHistory(true);
            });
            await act(async () => {
                await latest.current?.actions.restoreSnapshot('snap-1');
            });
            expect(adapter.restoreSnapshot).toHaveBeenCalledWith('v1', 'snap-1');
            expect(latest.current?.tree?.nodes.r1?.prompt).toBe('Restored');
            expect(latest.current?.showDraftHistory).toBe(false);
        });
    });

    describe('audit', () => {
        it('lists audit events when showAudit becomes true', async () => {
            const listAudit = vi.fn(async () => [
                { id: 'a1', action: 'publish', actor: 'alice', detail: {}, created_on: '2025-01-01' },
            ]);
            const adapter = buildAdapter({ listAudit });
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            await act(async () => {
                latest.current!.actions.setShowAudit(true);
            });
            await act(async () => {
                await new Promise((r) => setTimeout(r, 0));
            });
            expect(listAudit).toHaveBeenCalledWith('v1');
            expect(latest.current?.auditEvents).toHaveLength(1);
            expect(latest.current?.auditEvents[0]?.actor).toBe('alice');
        });

        it('cancels in-flight audit loading when showAudit is toggled off', async () => {
            let resolveAudit: ((value: unknown[]) => void) | undefined;
            const listAudit = vi.fn(
                () =>
                    new Promise<unknown[]>((resolve) => {
                        resolveAudit = resolve;
                    })
            );
            const adapter = buildAdapter({ listAudit });
            const { latest, unmount } = await mountHook({ adapter, entityId: 'v1' });

            await act(async () => {
                latest.current!.actions.setShowAudit(true);
            });
            await act(async () => {
                latest.current!.actions.setShowAudit(false);
            });
            unmount();
            await act(async () => {
                resolveAudit?.([{ id: 'late', action: 'publish', actor: 'bob', detail: {}, created_on: '2025-01-02' }]);
                await new Promise((r) => setTimeout(r, 0));
            });
            expect(listAudit).toHaveBeenCalledWith('v1');
        });
    });

    describe('clone-to-draft', () => {
        it('invokes adapter.cloneToDraft and routes to the new id via onCloneNavigate', async () => {
            const cloneToDraft = vi.fn(async () => ({ id: 'new-draft' }));
            const onCloneNavigate = vi.fn();
            const adapter = buildAdapter({ cloneToDraft });
            const { latest } = await mountHook({ adapter, entityId: 'v1', onCloneNavigate });
            await act(async () => {
                await latest.current?.actions.cloneToDraft();
            });
            expect(cloneToDraft).toHaveBeenCalledWith('v1');
            expect(onCloneNavigate).toHaveBeenCalledWith('new-draft');
        });
    });

    describe('selection', () => {
        it('selectIssue focuses a node and bumps the fitView nonce', async () => {
            const adapter = buildAdapter();
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            const before = latest.current?.fitViewNonce ?? 0;
            await act(async () => {
                latest.current!.actions.selectIssue({ node_id: 'n1', choice_id: 'c1' });
            });
            expect(latest.current?.selection.kind).toBe(GRAPH_SELECTION_KIND.NODE);
            expect(latest.current?.selection.id).toBe('n1');
            expect(latest.current?.focusNodeId).toBe('n1');
            expect(latest.current?.focusChoiceId).toBe('c1');
            expect(latest.current?.fitViewNonce).toBe(before + 1);
        });

        it('selectIssue no-ops when the issue has no node id', async () => {
            const adapter = buildAdapter();
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            const beforeSelection = latest.current?.selection;
            const beforeNonce = latest.current?.fitViewNonce ?? 0;
            await act(async () => {
                latest.current!.actions.selectIssue({ severity: 'warning', message: 'Orphan issue' });
            });
            expect(latest.current?.selection).toEqual(beforeSelection);
            expect(latest.current?.fitViewNonce).toBe(beforeNonce);
        });

        it('selectedNode derives from selection.kind=NODE', async () => {
            const adapter = buildAdapter();
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            await act(async () => {
                latest.current!.actions.setSelection({ kind: GRAPH_SELECTION_KIND.NODE, id: 'n1' });
            });
            expect(latest.current?.selectedNode?.id).toBe('n1');
            expect(latest.current?.focusNodeId).toBe('n1');
        });

        it('selectChoice keeps the node selected and focuses the choice', async () => {
            const adapter = buildAdapter();
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            await act(async () => {
                latest.current!.actions.selectChoice('n1', 'c1');
            });
            expect(latest.current?.selection).toEqual({ kind: GRAPH_SELECTION_KIND.NODE, id: 'n1' });
            expect(latest.current?.focusChoiceId).toBe('c1');
            expect(latest.current?.focusNodeId).toBe('n1');
        });

        it('setSelection on a node clears choice focus', async () => {
            const adapter = buildAdapter();
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            await act(async () => {
                latest.current!.actions.selectChoice('n1', 'c1');
            });
            await act(async () => {
                latest.current!.actions.setSelection({ kind: GRAPH_SELECTION_KIND.NODE, id: 'n1' });
            });
            expect(latest.current?.focusChoiceId).toBeNull();
        });

        it('selectedNode is null when the END_NODE is selected', async () => {
            const adapter = buildAdapter();
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            await act(async () => {
                latest.current!.actions.setSelection({ kind: GRAPH_SELECTION_KIND.NODE, id: END_NODE_ID });
            });
            expect(latest.current?.selectedNode).toBeNull();
        });

        it('edge selection focuses the source choice and exposes inspectorNode', async () => {
            const wire = {
                wire_version: 1,
                start_node: 'n1',
                nodes: {
                    n1: {
                        type: 'prompt',
                        prompt: 'Pick one',
                        choices: [
                            { id: 'c1', label: 'A' },
                            { id: 'c2', label: 'B' },
                        ],
                    },
                    n2: { type: 'prompt', prompt: 'Next', choices: [] },
                },
                transitions: [{ from: ['n1', 'c2'], to: 'n2' }],
            };
            const adapter = buildAdapter({
                getVersion: vi.fn(async () => ({ tree_spec: wire, is_published: false })),
            });
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            const edgeId = latest.current?.tree?.transitions[0]?.id;
            expect(edgeId).toBeTruthy();

            await act(async () => {
                latest.current!.actions.setSelection({ kind: GRAPH_SELECTION_KIND.EDGE, id: edgeId! });
            });

            expect(latest.current?.selectedNode).toBeNull();
            expect(latest.current?.selectedEdge?.fromChoiceId).toBe('c2');
            expect(latest.current?.focusChoiceId).toBe('c2');
            expect(latest.current?.focusNodeId).toBe('n1');
            expect(latest.current?.inspectorNode?.id).toBe('n1');
        });
    });

    describe('node operations', () => {
        it('addNodeOfType inserts and selects a new node', async () => {
            const adapter = buildAdapter();
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            let id: string | undefined;
            await act(async () => {
                id = latest.current!.actions.addNodeOfType('email');
            });
            expect(id).toBeDefined();
            expect(latest.current?.tree?.nodes[id!]).toBeDefined();
            expect(latest.current?.tree?.nodes[id!]?.type).toBe('email');
            expect(latest.current?.selection).toEqual({ kind: GRAPH_SELECTION_KIND.NODE, id });
        });

        it('deleteSelectedNode removes the selected node and clears selection', async () => {
            const adapter = buildAdapter();
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            await act(async () => {
                latest.current!.actions.setSelection({ kind: GRAPH_SELECTION_KIND.NODE, id: 'n1' });
            });
            let removed: boolean | undefined;
            await act(async () => {
                removed = latest.current!.actions.deleteSelectedNode();
            });
            expect(removed).toBe(true);
            expect(latest.current?.tree?.nodes.n1).toBeUndefined();
            expect(latest.current?.selection).toEqual({ kind: null, id: null });
        });

        it('setSelection(null) clears focus node and choice', async () => {
            const adapter = buildAdapter();
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            await act(async () => {
                latest.current!.actions.setSelection({ kind: GRAPH_SELECTION_KIND.NODE, id: 'n1' });
                latest.current!.actions.setFocusChoiceId('c1');
            });
            await act(async () => {
                latest.current!.actions.setSelection({ kind: null, id: null });
            });
            expect(latest.current?.focusNodeId).toBeNull();
            expect(latest.current?.focusChoiceId).toBeNull();
        });

        it('deleteSelectedNode returns false when published', async () => {
            const adapter = buildAdapter({
                getVersion: vi.fn(async () => ({
                    tree_spec: buildSampleWire(),
                    is_published: true,
                })),
            });
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            await act(async () => {
                latest.current!.actions.setSelection({ kind: GRAPH_SELECTION_KIND.NODE, id: 'n1' });
            });
            let removed: boolean | undefined;
            await act(async () => {
                removed = latest.current!.actions.deleteSelectedNode();
            });
            expect(removed).toBe(false);
            expect(latest.current?.tree?.nodes.n1).toBeDefined();
        });

        it('deleteNodeById removes a node by id', async () => {
            const adapter = buildAdapter();
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            let removed: boolean | undefined;
            await act(async () => {
                removed = latest.current!.actions.deleteNodeById('n1');
            });
            expect(removed).toBe(true);
            expect(latest.current?.tree?.nodes.n1).toBeUndefined();
        });

        it('deleteNodeById clears focus when the focused node is removed without selection', async () => {
            const adapter = buildAdapter();
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            await act(async () => {
                latest.current!.actions.selectIssue({ node_id: 'n1', choice_id: 'c1' });
            });
            await act(async () => {
                latest.current!.actions.setSelection({ kind: GRAPH_SELECTION_KIND.EDGE, id: 'edge-1' });
            });
            expect(latest.current?.focusNodeId).toBe('n1');

            await act(async () => {
                latest.current!.actions.deleteNodeById('n1');
            });
            expect(latest.current?.tree?.nodes.n1).toBeUndefined();
            expect(latest.current?.focusNodeId).toBeNull();
        });

        it('autoLayout reflows positions and bumps fitView', async () => {
            const adapter = buildAdapter();
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            const beforeNonce = latest.current?.fitViewNonce ?? 0;
            await act(async () => {
                latest.current!.actions.autoLayout();
            });
            expect(latest.current?.fitViewNonce).toBe(beforeNonce + 1);
        });

        it('insertTemplate selects the spawned focus node', async () => {
            const adapter = buildAdapter();
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            const template: TreeTemplateSpec = {
                focusSlot: 'focus',
                nodes: {
                    focus: {
                        type: 'prompt',
                        prompt: 'Template prompt',
                        choices: [{ id: 'a', label: 'A' }],
                        offset: { x: 0, y: 0 },
                    },
                },
                transitions: [],
            };
            await act(async () => {
                latest.current!.actions.insertTemplate(template);
            });
            expect(latest.current?.selection.kind).toBe(GRAPH_SELECTION_KIND.NODE);
            expect(latest.current?.focusNodeId).not.toBeNull();
        });
    });

    describe('undo, redo, copy, and paste', () => {
        it('undo and redo restore prior tree edits', async () => {
            const adapter = buildAdapter();
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            expect(latest.current?.canUndo).toBe(false);

            await act(async () => {
                const tree = latest.current!.tree!;
                latest.current!.actions.setTree({
                    ...tree,
                    nodes: { ...tree.nodes, n1: { ...tree.nodes.n1!, prompt: 'Edited once' } },
                });
            });
            expect(latest.current?.tree?.nodes.n1?.prompt).toBe('Edited once');
            expect(latest.current?.canUndo).toBe(true);

            await act(async () => {
                latest.current!.actions.undo();
            });
            expect(latest.current?.tree?.nodes.n1?.prompt).toBe('Pick one');
            expect(latest.current?.canRedo).toBe(true);

            await act(async () => {
                latest.current!.actions.redo();
            });
            expect(latest.current?.tree?.nodes.n1?.prompt).toBe('Edited once');
        });

        it('clears undo history when a snapshot is restored', async () => {
            const restoredWire = {
                wire_version: 1,
                start_node: 'r1',
                nodes: { r1: { type: 'prompt', prompt: 'Restored', choices: [] as Array<{ id: string; label: string }> } },
                transitions: [],
            };
            const adapter = buildAdapter({
                restoreSnapshot: vi.fn(async () => ({ tree_spec: restoredWire })),
            });
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            await act(async () => {
                const tree = latest.current!.tree!;
                latest.current!.actions.setTree({
                    ...tree,
                    nodes: { ...tree.nodes, n1: { ...tree.nodes.n1!, prompt: 'Dirty edit' } },
                });
            });
            expect(latest.current?.canUndo).toBe(true);

            await act(async () => {
                await latest.current?.actions.restoreSnapshot('snap-1');
            });
            expect(latest.current?.canUndo).toBe(false);
            expect(latest.current?.canRedo).toBe(false);
        });

        it('copy and paste duplicate the copied node', async () => {
            const adapter = buildAdapter();
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            await act(async () => {
                latest.current!.actions.setSelection({ kind: GRAPH_SELECTION_KIND.NODE, id: 'n1' });
            });
            await act(async () => {
                latest.current!.actions.copySelectedNode();
            });
            expect(latest.current?.hasCopiedNode).toBe(true);

            const beforeCount = Object.keys(latest.current?.tree?.nodes ?? {}).length;
            await act(async () => {
                latest.current!.actions.pasteCopiedNode();
            });
            expect(Object.keys(latest.current?.tree?.nodes ?? {})).toHaveLength(beforeCount + 1);
        });

        it('duplicateNodeById clones a node and selects the copy', async () => {
            const adapter = buildAdapter();
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            const beforeCount = Object.keys(latest.current?.tree?.nodes ?? {}).length;
            let newId: string | undefined;
            await act(async () => {
                newId = latest.current!.actions.duplicateNodeById('n1');
            });
            expect(newId).toBeDefined();
            expect(Object.keys(latest.current?.tree?.nodes ?? {})).toHaveLength(beforeCount + 1);
            expect(latest.current?.selection).toEqual({ kind: GRAPH_SELECTION_KIND.NODE, id: newId });
        });

        it('setChoiceType renames a choice id and updates transitions', async () => {
            const wire = {
                wire_version: 1,
                start_node: 'n1',
                nodes: {
                    n1: {
                        type: 'prompt',
                        prompt: 'Pick',
                        choices: [
                            { id: 'c1', label: 'First' },
                            { id: 'c2', label: 'Second' },
                        ],
                    },
                },
                transitions: [{ from: ['n1', 'c1'], to: 'END', outcome: 'safe' }],
            };
            const adapter = buildAdapter({
                getVersion: vi.fn(async () => ({ tree_spec: wire, is_published: false })),
            });
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            await act(async () => {
                latest.current!.actions.setSelection({ kind: GRAPH_SELECTION_KIND.NODE, id: 'n1' });
            });
            await act(async () => {
                latest.current!.actions.setChoiceType('c1', 'verify', 'Verify through official channels');
            });
            expect(latest.current?.selectedNode?.choices?.some((c) => c.id === 'verify')).toBe(true);
            expect(
                latest.current?.tree?.transitions.some(
                    (t) => t.fromNodeId === 'n1' && t.fromChoiceId === 'verify',
                ),
            ).toBe(true);
        });

        it('setChoiceType applies defaultLabel when the choice label is blank', async () => {
            const wire = {
                wire_version: 1,
                start_node: 'n1',
                nodes: {
                    n1: {
                        type: 'prompt',
                        prompt: 'Pick',
                        choices: [{ id: 'c1', label: 'New choice' }],
                    },
                },
                transitions: [],
            };
            const adapter = buildAdapter({
                getVersion: vi.fn(async () => ({ tree_spec: wire, is_published: false })),
            });
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            await act(async () => {
                latest.current!.actions.setSelection({ kind: GRAPH_SELECTION_KIND.NODE, id: 'n1' });
            });
            await act(async () => {
                latest.current!.actions.setChoiceType('c1', 'verify', 'Verify sender');
            });
            const choice = latest.current?.tree?.nodes.n1?.choices?.find((c) => c.id === 'verify');
            expect(choice?.label).toBe('Verify sender');
        });

        it('setChoiceType re-selects the renamed choice when it was focused', async () => {
            const wire = {
                wire_version: 1,
                start_node: 'n1',
                nodes: {
                    n1: {
                        type: 'prompt',
                        prompt: 'Pick',
                        choices: [{ id: 'c1', label: 'First' }],
                    },
                },
                transitions: [],
            };
            const adapter = buildAdapter({
                getVersion: vi.fn(async () => ({ tree_spec: wire, is_published: false })),
            });
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            await act(async () => {
                latest.current!.actions.setSelection({ kind: GRAPH_SELECTION_KIND.NODE, id: 'n1' });
            });
            await act(async () => {
                latest.current!.actions.selectChoice('n1', 'c1');
            });
            expect(latest.current?.focusChoiceId).toBe('c1');

            await act(async () => {
                latest.current!.actions.setChoiceType('c1', 'verify', 'Verify sender');
            });

            expect(latest.current?.focusChoiceId).toBe('verify');
            expect(latest.current?.tree?.nodes.n1?.choices?.some((c) => c.id === 'verify')).toBe(true);
        });

        it('updateChoiceEdgeHints patches render_hints on the target choice', async () => {
            const adapter = buildAdapter();
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            await act(async () => {
                latest.current!.actions.updateChoiceEdgeHints('n1', 'c1', { strokeColor: '#aabbcc' });
            });
            const choice = latest.current?.tree?.nodes.n1?.choices?.find((c) => c.id === 'c1');
            expect(choice?.render_hints?.editor?.strokeColor).toBe('#aabbcc');
        });

        it('setDefaultEdgeType updates graph editor meta on the tree', async () => {
            const adapter = buildAdapter();
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            await act(async () => {
                latest.current!.actions.setDefaultEdgeType('step');
            });
            expect(latest.current?.tree?._meta?.graph_editor?.default_edge_type).toBe('step');
        });

        async function bootstrapWithSelection() {
            const adapter = buildAdapter();
            const ctx = await mountHook({ adapter, entityId: 'v1' });
            await act(async () => {
                ctx.latest.current!.actions.setSelection({ kind: GRAPH_SELECTION_KIND.NODE, id: 'n1' });
            });
            return { adapter, ...ctx };
        }

        it('addChoice appends a choice to the selected node', async () => {
            const { latest } = await bootstrapWithSelection();
            const beforeCount = latest.current?.selectedNode?.choices?.length ?? 0;
            await act(async () => {
                latest.current!.actions.addChoice();
            });
            expect(latest.current?.selectedNode?.choices ?? []).toHaveLength(beforeCount + 1);
        });

        it('deleteChoice removes a choice from the selected node', async () => {
            const { latest } = await bootstrapWithSelection();
            await act(async () => {
                latest.current!.actions.deleteChoice('c1');
            });
            expect(latest.current?.selectedNode?.choices?.find((c) => c.id === 'c1')).toBeUndefined();
        });

        it('moveChoice reorders choices on the selected node', async () => {
            const wire = {
                wire_version: 1,
                start_node: 'n1',
                nodes: {
                    n1: {
                        type: 'prompt',
                        prompt: 'Pick',
                        choices: [
                            { id: 'c1', label: 'First' },
                            { id: 'c2', label: 'Second' },
                        ],
                    },
                },
                transitions: [],
            };
            const adapter = buildAdapter({
                getVersion: vi.fn(async () => ({ tree_spec: wire, is_published: false })),
            });
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            await act(async () => {
                latest.current!.actions.setSelection({ kind: GRAPH_SELECTION_KIND.NODE, id: 'n1' });
            });
            await act(async () => {
                latest.current!.actions.moveChoice('c2', 'up');
            });
            expect(latest.current?.selectedNode?.choices?.map((choice) => choice.id)).toEqual(['c2', 'c1']);
        });

        it('repositionChoice moves a choice onto another node', async () => {
            const wire = {
                wire_version: 1,
                start_node: 'n1',
                nodes: {
                    n1: {
                        type: 'prompt',
                        prompt: 'A',
                        choices: [
                            { id: 'c1', label: 'First' },
                            { id: 'c2', label: 'Second' },
                        ],
                    },
                    n2: {
                        type: 'prompt',
                        prompt: 'B',
                        choices: [{ id: 'c3', label: 'Third' }],
                    },
                },
                transitions: [{ from: ['n1', 'c2'], to: END_NODE_ID, outcome: 'safe' }],
            };
            const adapter = buildAdapter({
                getVersion: vi.fn(async () => ({ tree_spec: wire, is_published: false })),
            });
            const { latest } = await mountHook({ adapter, entityId: 'v1' });
            await act(async () => {
                latest.current!.actions.repositionChoice('n1', 'c2', 'n2', 1);
            });
            expect(latest.current?.tree?.nodes.n1.choices?.map((choice) => choice.id)).toEqual(['c1']);
            expect(latest.current?.tree?.nodes.n2.choices?.map((choice) => choice.id)).toEqual(['c3', 'c2']);
            expect(latest.current?.selection.id).toBe('n2');
            expect(latest.current?.focusChoiceId).toBe('c2');
            const tx = latest.current?.tree?.transitions.find((t) => t.fromChoiceId === 'c2');
            expect(tx?.fromNodeId).toBe('n2');
        });

        it('setChoiceTarget creates a transition to the target node', async () => {
            const { latest } = await bootstrapWithSelection();
            await act(async () => {
                latest.current!.actions.addNodeOfType('prompt');
            });
            const newNodeId = latest.current?.selection.id;
            // Reselect the originally-loaded node
            await act(async () => {
                latest.current!.actions.setSelection({ kind: GRAPH_SELECTION_KIND.NODE, id: 'n1' });
            });
            await act(async () => {
                latest.current!.actions.setChoiceTarget('c1', newNodeId!);
            });
            const tx = latest.current?.tree?.transitions.find(
                (t) => t.fromNodeId === 'n1' && t.fromChoiceId === 'c1'
            );
            expect(tx?.toNodeId).toBe(newNodeId);
        });

        it('setChoiceTarget defaults END outcomes to at_risk when none exists', async () => {
            const { latest } = await bootstrapWithSelection();
            await act(async () => {
                latest.current!.actions.setChoiceTarget('c1', END_NODE_ID);
            });
            const tx = latest.current?.tree?.transitions.find(
                (t) => t.fromNodeId === 'n1' && t.fromChoiceId === 'c1'
            );
            expect(tx?.toNodeId).toBe(END_NODE_ID);
            expect(tx?.outcome).toBe('at_risk');
        });

        it('setChoiceOutcome updates END transitions and ignores invalid outcomes', async () => {
            const { latest } = await bootstrapWithSelection();
            await act(async () => {
                latest.current!.actions.setChoiceTarget('c1', END_NODE_ID);
            });
            await act(async () => {
                latest.current!.actions.setChoiceOutcome('c1', 'safe');
            });
            const endTx = latest.current?.tree?.transitions.find(
                (t) => t.fromNodeId === 'n1' && t.fromChoiceId === 'c1'
            );
            expect(endTx?.outcome).toBe('safe');

            await act(async () => {
                latest.current!.actions.setChoiceOutcome('c1', 'not-a-valid-outcome');
            });
            const unchangedTx = latest.current?.tree?.transitions.find(
                (t) => t.fromNodeId === 'n1' && t.fromChoiceId === 'c1'
            );
            expect(unchangedTx?.outcome).toBe('safe');
        });
    });

    describe('keyboard shortcuts and focus scrolling', () => {
        type KeydownListener = (event: {
            key: string;
            ctrlKey?: boolean;
            metaKey?: boolean;
            shiftKey?: boolean;
            target?: EventTarget | null;
            preventDefault?: () => void;
        }) => void;

        class FakeHTMLElement {
            tagName = '';
            getAttribute(_name: string): string | null {
                return null;
            }
        }

        let originalHTMLElement: typeof HTMLElement | undefined;

        beforeEach(() => {
            originalHTMLElement = (globalThis as { HTMLElement?: typeof HTMLElement }).HTMLElement;
            (globalThis as { HTMLElement?: typeof FakeHTMLElement }).HTMLElement = FakeHTMLElement;
        });

        afterEach(() => {
            (globalThis as { HTMLElement?: typeof HTMLElement }).HTMLElement = originalHTMLElement;
        });

        function installKeyboardHarness() {
            const listeners: KeydownListener[] = [];
            const addEventListener = vi.fn((type: string, handler: EventListenerOrEventListenerObject) => {
                if (type === 'keydown' && typeof handler === 'function') {
                    listeners.push(handler as KeydownListener);
                }
            });
            const removeEventListener = vi.fn();
            (globalThis as { addEventListener?: typeof addEventListener }).addEventListener = addEventListener;
            (globalThis as { removeEventListener?: typeof removeEventListener }).removeEventListener = removeEventListener;
            return {
                dispatchKey(options: {
                    key: string;
                    ctrlKey?: boolean;
                    metaKey?: boolean;
                    shiftKey?: boolean;
                    target?: EventTarget | null;
                }) {
                    const preventDefault = vi.fn();
                    for (const listener of listeners) {
                        listener({
                            key: options.key,
                            ctrlKey: options.ctrlKey ?? false,
                            metaKey: options.metaKey ?? false,
                            shiftKey: options.shiftKey ?? false,
                            target: options.target ?? null,
                            preventDefault,
                        });
                    }
                    return { preventDefault };
                },
                addEventListener,
                removeEventListener,
            };
        }

        it('scrolls the focused choice into view when document is available', async () => {
            const scrollIntoView = vi.fn();
            const originalDocument = globalThis.document;
            (globalThis as { document?: Document }).document = {
                getElementById: vi.fn((id: string) =>
                    id === 'choice-editor-n1-c1' ? ({ scrollIntoView } as HTMLElement) : null
                ),
            } as unknown as Document;

            try {
                const adapter = buildAdapter();
                const { latest } = await mountHook({ adapter, entityId: 'v1' });
                await act(async () => {
                    latest.current!.actions.setSelection({ kind: GRAPH_SELECTION_KIND.NODE, id: 'n1' });
                    latest.current!.actions.setFocusChoiceId('c1');
                });
                expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', behavior: 'smooth' });
            } finally {
                (globalThis as { document?: Document }).document = originalDocument;
            }
        });

        it('handles save, validate, preview, duplicate, delete, undo, copy, and paste shortcuts', async () => {
            const keyboard = installKeyboardHarness();
            const updateVersion = vi.fn(async () => undefined);
            const validate = vi.fn(async () => ({ valid: true, issues: [] }));
            const onPreview = vi.fn();
            const adapter = buildAdapter({ updateVersion, validate });
            const { latest } = await mountHook({
                adapter,
                entityId: 'v1',
                onPreview,
            });

            await act(async () => {
                latest.current!.actions.setSelection({ kind: GRAPH_SELECTION_KIND.NODE, id: 'n1' });
            });

            await act(async () => {
                keyboard.dispatchKey({ key: 's', ctrlKey: true });
            });
            expect(updateVersion).toHaveBeenCalled();

            await act(async () => {
                keyboard.dispatchKey({ key: 'v', ctrlKey: true, shiftKey: true });
            });
            expect(validate).toHaveBeenCalled();

            await act(async () => {
                onPreview.mockClear();
                keyboard.dispatchKey({ key: 'p', ctrlKey: true });
            });
            expect(onPreview).toHaveBeenCalled();

            const beforeDuplicateCount = Object.keys(latest.current?.tree?.nodes ?? {}).length;
            await act(async () => {
                keyboard.dispatchKey({ key: 'd', ctrlKey: true });
            });
            expect(Object.keys(latest.current?.tree?.nodes ?? {})).toHaveLength(beforeDuplicateCount + 1);

            await act(async () => {
                latest.current!.actions.setSelection({ kind: GRAPH_SELECTION_KIND.NODE, id: 'n1' });
            });
            await act(async () => {
                const tree = latest.current!.tree!;
                latest.current!.actions.setTree({
                    ...tree,
                    nodes: { ...tree.nodes, n1: { ...tree.nodes.n1!, prompt: 'Before undo' } },
                });
            });
            await act(async () => {
                keyboard.dispatchKey({ key: 'z', ctrlKey: true });
            });
            expect(latest.current?.tree?.nodes.n1?.prompt).toBe('Pick one');

            await act(async () => {
                latest.current!.actions.setSelection({ kind: GRAPH_SELECTION_KIND.NODE, id: 'n1' });
            });
            await act(async () => {
                keyboard.dispatchKey({ key: 'c', ctrlKey: true });
            });
            expect(latest.current?.hasCopiedNode).toBe(true);
            const beforePasteCount = Object.keys(latest.current?.tree?.nodes ?? {}).length;
            await act(async () => {
                keyboard.dispatchKey({ key: 'v', ctrlKey: true });
            });
            expect(Object.keys(latest.current?.tree?.nodes ?? {})).toHaveLength(beforePasteCount + 1);

            await act(async () => {
                latest.current!.actions.setSelection({ kind: GRAPH_SELECTION_KIND.NODE, id: 'n1' });
            });
            await act(async () => {
                keyboard.dispatchKey({ key: 'Delete' });
            });
            expect(latest.current?.tree?.nodes.n1).toBeUndefined();
        });

        it('handles redo and delete-edge keyboard shortcuts', async () => {
            const keyboard = installKeyboardHarness();
            const wire = {
                wire_version: 1,
                start_node: 'n1',
                nodes: {
                    n1: {
                        type: 'prompt',
                        prompt: 'Pick one',
                        choices: [
                            { id: 'c1', label: 'A' },
                            { id: 'c2', label: 'B' },
                        ],
                    },
                    n2: { type: 'prompt', prompt: 'Next', choices: [] },
                },
                transitions: [{ from: ['n1', 'c2'], to: 'n2' }],
            };
            const adapter = buildAdapter({
                getVersion: vi.fn(async () => ({ tree_spec: wire, is_published: false })),
            });
            const { latest } = await mountHook({ adapter, entityId: 'v1' });

            await act(async () => {
                const tree = latest.current!.tree!;
                latest.current!.actions.setTree({
                    ...tree,
                    nodes: { ...tree.nodes, n1: { ...tree.nodes.n1!, prompt: 'Redo me' } },
                });
            });
            await act(async () => {
                keyboard.dispatchKey({ key: 'z', ctrlKey: true });
            });
            expect(latest.current?.tree?.nodes.n1?.prompt).toBe('Pick one');

            await act(async () => {
                keyboard.dispatchKey({ key: 'z', ctrlKey: true, shiftKey: true });
            });
            expect(latest.current?.tree?.nodes.n1?.prompt).toBe('Redo me');

            const edgeId = latest.current!.tree!.transitions[0]!.id;
            await act(async () => {
                latest.current!.actions.setSelection({ kind: GRAPH_SELECTION_KIND.EDGE, id: edgeId });
            });
            const before = latest.current!.tree!.transitions.length;
            await act(async () => {
                keyboard.dispatchKey({ key: 'Delete' });
            });
            expect(latest.current!.tree!.transitions).toHaveLength(before - 1);
        });

        it('ignores keyboard shortcuts in text fields and when preview is unavailable', async () => {
            const keyboard = installKeyboardHarness();
            const onPreview = vi.fn();
            const adapter = buildAdapter();
            const { latest } = await mountHook({ adapter, entityId: 'v1' });

            const textTarget = Object.create(FakeHTMLElement.prototype) as FakeHTMLElement;
            textTarget.tagName = 'INPUT';

            await act(async () => {
                keyboard.dispatchKey({
                    key: 'p',
                    ctrlKey: true,
                    target: textTarget as unknown as EventTarget,
                });
            });
            expect(onPreview).not.toHaveBeenCalled();

            await act(async () => {
                keyboard.dispatchKey({ key: 'p', ctrlKey: true });
            });
            expect(onPreview).not.toHaveBeenCalled();
            expect(latest.current?.tree?.nodes.n1).toBeDefined();
        });
    });

    describe('boundary commitments', () => {
        it('returned actions are callable without throwing for an unloaded editor', async () => {
            const adapter = buildAdapter();
            const { latest } = await mountHook({ adapter, entityId: undefined });
            // entityId is undefined → tree is null → actions should no-op safely
            await act(async () => {
                await latest.current?.actions.saveDraft();
                await latest.current?.actions.publish();
                await latest.current?.actions.validate();
                await latest.current?.actions.createSnapshot();
                await latest.current?.actions.cloneToDraft();
                latest.current?.actions.addChoice();
                latest.current?.actions.autoLayout();
                latest.current?.actions.addNodeOfType('prompt');
                latest.current?.actions.deleteSelectedNode();
                latest.current?.actions.deleteNodeById('n1');
            });
            expect(latest.current?.loading).toBe(true);
        });
    });
});
