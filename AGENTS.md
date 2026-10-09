# Development rules

## Scope

`@signalsafe/tree-spec-editor-react` is the React Flow canvas and editor hooks built on `@signalsafe/tree-spec-editor-core`. It owns canvas nodes, edges, selection, history and autosave hooks. Inspector panels, modals and toolbars belong to `tree-spec-editor`; stylesheets belong to `tree-spec-editor-theme-bootstrap`.

- UI-kit agnostic: emit semantic `graph-editor-*` class names and slots; never import react-bootstrap or ship CSS here.
- Host needs go through optional props, render slots or class hooks, not host-specific branches. Follow `.codex/skills/editor-extension-points/SKILL.md` and `.codex/skills/react-solid-principles/SKILL.md`.
- Keep `@signalsafe/tree-spec` and `@signalsafe/tree-spec-editor-core` on the current minor ranges so consumers resolve one copy of each.

## Quality gates

Run `yarn typecheck`, `yarn test:coverage` and `yarn smoke:package`. Update the pinned version assertion in `tests/package-metadata.test.ts` when bumping.

## Releases

Follow `.codex/skills/ecosystem-release/SKILL.md`. Never tag, publish or push without explicit user approval.
