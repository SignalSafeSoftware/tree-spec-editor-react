# @signalsafe/tree-spec-editor-react

Headless **React + React Flow** layer for the SignalSafe TreeSpec graph editor: canvas component, orchestration hook, and wiring to `@signalsafe/tree-spec-editor-core`.

| | |
|---|---|
| **npm** | `@signalsafe/tree-spec-editor-react` |
| **GitHub** | [SignalSafeSoftware/tree-spec-editor-react](https://github.com/SignalSafeSoftware/tree-spec-editor-react) |
| **Peer deps** | `react`, `react-dom`, `reactflow` (^18 / ^11) — **no UI library required** |

## UI-kit agnostic canvas

The React Flow canvas uses **semantic HTML** and **`graph-editor-*` class hooks** only. It does **not** require Bootstrap CSS, Bootstrap Icons, or any component library.

**Host applications own styling.** Map `graph-editor-*` in your theme, or pass `className` on `TreeSpecGraphEditor` for layout/sizing. See [docs/UI_KIT_AGNOSTIC_CANVAS.md](./docs/UI_KIT_AGNOSTIC_CANVAS.md).

## What this package does

- Renders **`TreeSpecGraphEditor`** (React Flow canvas, custom nodes/edges, selection).
- Exposes **`useTreeSpecEditor`** for load/validate/autosave/publish orchestration (host injects adapter callbacks).
- Re-exports core editor types used by the hook.

## What this package does not do

- Sidebar panels, modals, toolbars, or UI-kit chrome — use `@signalsafe/tree-spec-editor` or your own UI shell.
- Routing, HTTP, authentication, or persistence — host app provides adapter implementations.
- Wire compile/publish to a backend without your adapter code.

## Install

```bash
npm install @signalsafe/tree-spec-editor-react @signalsafe/tree-spec-editor-core @signalsafe/tree-spec react react-dom reactflow
```

### React Flow CSS (required)

This package imports `reactflow/dist/style.css` from source. Bundlers treat it as a side effect (`sideEffects: ["**/*.css"]` in `package.json`).

Ensure your app loads React Flow styles, for example:

```ts
import "reactflow/dist/style.css";
```

If you use `@signalsafe/tree-spec-editor` as the authoring shell, map `graph-editor-*` canvas hooks in host CSS — Bootstrap is optional and host-owned.

## Quick start

```tsx
import { useState } from "react";
import TreeSpecGraphEditor from "@signalsafe/tree-spec-editor-react";
import {
    END_NODE_ID,
    type EditorTree,
} from "@signalsafe/tree-spec-editor-core";

const initialTree: EditorTree = {
    start_node: "start",
    nodes: {
        start: {
            id: "start",
            type: "prompt",
            prompt: "Example prompt",
            choices: [{ id: "done", label: "Finish" }],
            position: { x: 40, y: 120 },
        },
    },
    transitions: [
        {
            id: "t1",
            fromNodeId: "start",
            fromChoiceId: "done",
            toNodeId: END_NODE_ID,
            outcome: "safe",
        },
    ],
};

export function ExampleCanvas() {
    const [tree, setTree] = useState(initialTree);
    return (
        <TreeSpecGraphEditor
            tree={tree}
            onChange={setTree}
            className="graph-editor-canvas-root my-canvas-host"
        />
    );
}
```

For full authoring flows (load/save/validate), compose **`useTreeSpecEditor`** with your adapter — see tests and `@signalsafe/tree-spec-editor` for a reference shell.

## Public exports

| Export | Purpose |
|---|---|
| `default` / `TreeSpecGraphEditor` | React Flow canvas |
| `TreeSpecGraphEditorProps` | Canvas props |
| `useTreeSpecEditor` | Stateful editor orchestration |
| `TreeSpecEditorAdapter`, `UseTreeSpecEditorResult`, … | Adapter and hook types |

Import from `@signalsafe/tree-spec-editor-react` only (no subpath exports).

## Package boundaries

| Layer | Package |
|---|---|
| Wire | `@signalsafe/tree-spec` |
| Editor model | `@signalsafe/tree-spec-editor-core` |
| **React canvas (this package)** | `@signalsafe/tree-spec-editor-react` |
| Authoring shell | `@signalsafe/tree-spec-editor` |

## Canvas selection behavior

| Selection | Inspector context | Contextual zoom (default on) |
|---|---|---|
| Node | selected node | fits node in viewport |
| Edge | source node + focused choice | viewport unchanged |
| Choice | `focusChoiceId` set | fits parent node when selected |

Pass `contextualZoom={false}` to disable automatic viewport fitting.

## Development

Requires Node.js **>=22.12.0** (`engines.node`). CI runs checks, tests, and smoke on Node **22** and **24**; publish uses Node **24**.

`yarn build` uses `tsconfig.build.json` and resolves `@signalsafe/*` from `node_modules`. Ecosystem sibling `paths` in `tsconfig.json` apply to local typecheck/tests only.

```bash
yarn install
yarn build
yarn test
yarn typecheck
```

## Security

See [SECURITY.md](./SECURITY.md). Host applications must authenticate users, authorize edits, and validate TreeSpec JSON server-side before publish.

## Changelog and releases

- [CHANGELOG.md](./CHANGELOG.md)
- [RELEASING.md](./RELEASING.md)

## Related packages

- [`@signalsafe/tree-spec-editor-core`](https://github.com/SignalSafeSoftware/tree-spec-editor-core) — framework-agnostic editor helpers.
- [`@signalsafe/tree-spec-editor`](https://github.com/SignalSafeSoftware/tree-spec-editor) — UI-kit agnostic authoring shell (panels, modals, toolbar).
