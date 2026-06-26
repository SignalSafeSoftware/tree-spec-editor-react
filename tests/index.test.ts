import { describe, expect, it } from 'vitest';
import TreeSpecGraphEditor, * as packageExports from '../src/index';

describe('@signalsafe/tree-spec-editor-react barrel', () => {
    it('re-exports the headless React canvas as default and named', () => {
        expect(packageExports.default).toBe(TreeSpecGraphEditor);
        expect(typeof packageExports.default).toBe('function');
    });

    it('exposes the headless orchestration hook', () => {
        expect(typeof packageExports.useTreeSpecEditor).toBe('function');
    });

    it('does not export any UI-library components', () => {
        const surface = Object.keys(packageExports);
        expect(surface).not.toContain('IssuesPanel');
        expect(surface).not.toContain('NodesPanel');
        expect(surface).not.toContain('InspectorPanel');
        expect(surface).not.toContain('PublishReviewModal');
        expect(surface).not.toContain('ToolbarPanel');
        expect(surface).not.toContain('getIssueSeverityBadgeClass');
    });

    it('documents the documented public hook export', () => {
        expect(packageExports.useTreeSpecEditor.name).toBe('useTreeSpecEditor');
    });
});
