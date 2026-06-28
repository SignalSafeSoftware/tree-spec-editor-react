/**
 * @packageDocumentation
 * Headless React layer for the SignalSafe TreeSpec graph editor.
 *
 * This package owns the React Flow canvas and the framework-shaped
 * orchestration hook ({@link useTreeSpecEditor}). It depends on `react`,
 * `react-dom`, `reactflow`, and `@signalsafe/tree-spec-editor-core`, but is
 * intentionally free of any UI library (no `react-bootstrap`, no Material,
 * no Tailwind) and any router (no `react-router-dom`, no Next.js router).
 * UI shells layer on top of this package; routing is host-injected via hook
 * callbacks.
 */

export { default } from './TreeSpecGraphEditor.js';
export type { TreeSpecGraphEditorProps } from './TreeSpecGraphEditor.js';

export { useTreeSpecEditor } from './hooks/useTreeSpecEditor.js';
export type {
    AdapterValidationIssue,
    GraphEditorVersionInfo,
    TreeSpecEditorAdapter,
    UseTreeSpecEditorActions,
    UseTreeSpecEditorOptions,
    UseTreeSpecEditorResult,
    UseTreeSpecEditorState,
} from './hooks/types.js';
