# @signalsafe/tree-spec-editor-react

Headless React layer for the SignalSafe TreeSpec graph editor. Renders the
React Flow canvas, owns React state plumbing, and exposes the editor as a
single React component — without depending on any specific UI library.

This is the React-specific sibling to **[`@signalsafe/tree-spec-editor-core`](../tree-spec-editor-core/README.md)**. The core package owns model + helpers (zero UI deps); this package owns React rendering. UI shells (e.g. `@signalsafe/tree-spec-editor` for React + Bootstrap, planned `@signalsafe/tree-spec-editor-react-mui` for React + Material) layer on top.

## What this package owns

- **`TreeSpecGraphEditor`** — the React Flow canvas (Background, Controls, MiniMap, custom node renderer, transition edges, selection wiring, choice focus highlighting, focus/fit-view).
- **`useTreeSpecEditor`** — stateful orchestration hook (load, autosave, validate, publish, selection, undo/redo, choice/edge helpers). Exposes `inspectorNode` (selected node or edge source node), `focusChoiceId`, and `selectedEdge` for sidebar panels.
- **`TreeSpecGraphEditorProps`** — props type.

## Canvas selection behavior

| Selection | Inspector context | Contextual zoom (`contextualZoom`, default `true`) |
|-----------|-------------------|-----------------------------------------------------|
| **Node** | `selectedNode` | Fits viewport to the node |
| **Edge** | `inspectorNode` = source node; `focusChoiceId` = source choice | **No pan/zoom** (viewport stays put) |
| **Choice** (canvas or inspector focus) | `focusChoiceId` set; nodes list highlights via `focusNodeId` | Fits when the parent node is selected |

Pass `onChoiceSelect` + `focusChoiceId` to keep canvas choice rows, inspector choice cards, and the nodes list in sync. Pass `contextualZoom={false}` to disable automatic viewport fitting on node selection.

## What lives elsewhere

| Concern | Package |
|--------|---------|
| Editor model, tree operations, layout, autosave/keyboard helpers, choice edge hints | `@signalsafe/tree-spec-editor-core` |
| Sidebar panels, inspector, modals, toolbar (Bootstrap-styled) | `@signalsafe/tree-spec-editor` |
| Material-styled React shell (planned) | `@signalsafe/tree-spec-editor-react-mui` |
| Angular shell + canvas (planned) | `@signalsafe/tree-spec-editor-angular` |
| Vue shell + canvas (planned) | `@signalsafe/tree-spec-editor-vue` |

## Maintainer notes

- **This package stays React + reactflow only.** Angular/Vue hosts will use `-core` with their own canvas packages, not `-react`.
- **Material (React)** hosts should add `-react-mui` (planned), reusing this canvas unchanged.
- Layer boundaries and refactor plan: [docs/ai/packages-editor-architecture.md](../../docs/ai/packages-editor-architecture.md).

## Install

```bash
npm install @signalsafe/tree-spec-editor-react react react-dom reactflow
```

`reactflow` is a peer dependency; you must install it (and ship its CSS,
e.g. `import 'reactflow/dist/style.css';`) in the consuming app. The
package itself imports the CSS file from its source, so bundlers that
resolve module references will pick it up automatically.

## Why a separate package?

This layer is React-specific but **UI-library-agnostic**. Hosts that want
to ship a Material-styled editor only need to publish their own UI shell
(panels, modals, toolbar) — they reuse the canvas and the editor model
unchanged. This also keeps `@signalsafe/tree-spec-editor` (the
Bootstrap variant) from being the sole React entry point.

## Repository

Standalone source and releases: [SignalSafeSoftware/tree-spec-editor-react](https://github.com/SignalSafeSoftware/tree-spec-editor-react).

Published as [`@signalsafe/tree-spec-editor-react`](https://www.npmjs.com/package/@signalsafe/tree-spec-editor-react) on npm.
