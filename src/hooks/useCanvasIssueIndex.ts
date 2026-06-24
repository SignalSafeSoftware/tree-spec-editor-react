import { useMemo } from 'react';

import { TREE_SPEC_ISSUE_SEVERITY } from '@signalsafe/tree-spec';
import type { GraphEditorIssue } from '@signalsafe/tree-spec-editor-core';

export type CanvasIssueIndex = {
    issuesByNode: Map<string, { total: number; errors: number; warnings: number; info: number }>;
    issueKeySet: Set<string>;
};

export function useCanvasIssueIndex(issues: GraphEditorIssue[]): CanvasIssueIndex {
    const issuesByNode = useMemo(() => {
        const m = new Map<string, { total: number; errors: number; warnings: number; info: number }>();
        for (const i of issues) {
            if (!i.node_id) continue;
            const cur = m.get(i.node_id) ?? { total: 0, errors: 0, warnings: 0, info: 0 };
            cur.total += 1;
            const sev = String(i.severity ?? '').toLowerCase();
            if (sev === TREE_SPEC_ISSUE_SEVERITY.WARNING) cur.warnings += 1;
            else if (sev === TREE_SPEC_ISSUE_SEVERITY.INFO) cur.info += 1;
            else cur.errors += 1;
            m.set(i.node_id, cur);
        }
        return m;
    }, [issues]);

    const issueKeySet = useMemo(() => {
        const s = new Set<string>();
        for (const i of issues) {
            if (!i.node_id || !i.choice_id) continue;
            s.add(`${i.node_id}::${i.choice_id}`);
        }
        return s;
    }, [issues]);

    return { issuesByNode, issueKeySet };
}
