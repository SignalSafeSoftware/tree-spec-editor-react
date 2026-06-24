import { useEffect, useRef } from 'react';
import type { ReactFlowInstance } from 'reactflow';

import { END_NODE_ID, GRAPH_SELECTION_KIND, type GraphSelection } from '@signalsafe/tree-spec-editor-core';

export type UseCanvasViewportOptions = {
    rf: ReactFlowInstance;
    focusNodeId?: string | null;
    fitViewNonce?: number;
    contextualZoom?: boolean;
    selected?: GraphSelection;
    suppressViewportSaveRef: React.MutableRefObject<boolean>;
};

export function useCanvasViewport(options: UseCanvasViewportOptions): void {
    const {
        rf,
        focusNodeId,
        fitViewNonce,
        contextualZoom = true,
        selected,
        suppressViewportSaveRef,
    } = options;

    const lastContextualSelectionRef = useRef<string | null>(null);

    useEffect(() => {
        if (!focusNodeId) return;
        suppressViewportSaveRef.current = true;
        try {
            const n = rf.getNode(focusNodeId);
            if (!n) return;
            rf.setCenter(n.position.x + 150, n.position.y + 60, { zoom: 1, duration: 300 });
        } catch {
            // ignore
        }
        const releaseId = globalThis.setTimeout(() => {
            suppressViewportSaveRef.current = false;
        }, 350);
        return () => globalThis.clearTimeout(releaseId);
    }, [focusNodeId, rf, suppressViewportSaveRef]);

    useEffect(() => {
        if (!fitViewNonce) return;
        suppressViewportSaveRef.current = true;
        const id = globalThis.setTimeout(() => {
            try {
                rf.fitView({ padding: 0.2, duration: 300 });
            } catch {
                // ignore
            }
        }, 100);
        const releaseId = globalThis.setTimeout(() => {
            suppressViewportSaveRef.current = false;
        }, 450);
        return () => {
            globalThis.clearTimeout(id);
            globalThis.clearTimeout(releaseId);
        };
    }, [fitViewNonce, rf, suppressViewportSaveRef]);

    useEffect(() => {
        if (!contextualZoom || !selected?.id) return;
        if (selected.kind === GRAPH_SELECTION_KIND.EDGE) return;
        if (focusNodeId && selected.kind === GRAPH_SELECTION_KIND.NODE && focusNodeId === selected.id) {
            return;
        }

        const selectionKey = `${selected.kind}:${selected.id}`;
        if (lastContextualSelectionRef.current === selectionKey) return;
        lastContextualSelectionRef.current = selectionKey;

        const nodeIds: string[] = [];
        if (selected.kind === GRAPH_SELECTION_KIND.NODE && selected.id !== END_NODE_ID) {
            nodeIds.push(selected.id);
        }
        if (nodeIds.length === 0) return;

        suppressViewportSaveRef.current = true;
        const id = globalThis.setTimeout(() => {
            try {
                rf.fitView({
                    nodes: nodeIds.map((nodeId) => ({ id: nodeId })),
                    padding: 0.35,
                    duration: 250,
                    maxZoom: 1.25,
                });
            } catch {
                // ignore
            }
        }, 0);
        const releaseId = globalThis.setTimeout(() => {
            suppressViewportSaveRef.current = false;
        }, 300);
        return () => {
            globalThis.clearTimeout(id);
            globalThis.clearTimeout(releaseId);
        };
    }, [contextualZoom, focusNodeId, rf, selected, suppressViewportSaveRef]);
}
