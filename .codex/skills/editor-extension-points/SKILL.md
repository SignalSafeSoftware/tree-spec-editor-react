---
name: editor-extension-points
description: "Add a host-facing capability to the TreeSpec editor packages (inspector, canvas, theme) through optional props, render slots and semantic class names instead of host CSS or markup hacks. Use when a host needs to reshape package UI, such as collapsible choice cards."
metadata:
  short-description: "Extend the editor through props, slots and classes"
---

# Editor extension points

Hosts should never need `:has()` selectors, DOM reordering or duplicated components to change package UI. If they do, the package is missing an extension point.

## Workflow

1. Describe the host need and its smallest generic form (behavior, not product wording). Check `InspectorPanelProps` and existing slots (`renderPromptField`, `renderExtraNodeFields`, `renderExtraChoiceFields`) first.
2. Choose the lightest mechanism: an optional prop with a default that leaves current output unchanged; a render slot with a context object; a semantic class name exported from `src/ui/editorClasses.ts`.
3. Implement in the owning package: model in `tree-spec-editor-core`, canvas in `tree-spec-editor-react`, panels in `tree-spec-editor`, CSS in `tree-spec-editor-theme-bootstrap`. Keep each component under the repository size limits by extracting a child component or hook rather than growing the parent.
4. State lives where the behavior lives: for example `collapsibleChoices` keeps one expanded choice id in `ChoiceEditorList` and passes `collapsible`, `expanded` and `onToggleExpanded` to `ChoiceEditorCard`.
5. Accessibility: toggles are real buttons with `aria-expanded` and `aria-controls`; hidden regions use the `hidden` attribute.
6. Tests: default output unchanged, new mode behavior, and fallbacks (empty label shows the id). Use the existing `react-test-renderer` helpers.
7. Document the prop in the package `README.md` and `CHANGELOG.md`, add the theme rule, and add the host removal note to the release plan (see `ecosystem-release`).

## Avoid

- Product vocabulary in prop names or classes.
- Props that duplicate a slot, or slots that expose internal state setters.
- Shipping CSS from `tree-spec-editor` or `tree-spec-editor-react`.
