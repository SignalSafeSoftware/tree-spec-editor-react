# @signalsafe/tree-spec-editor-react

Headless **React + React Flow** layer for the SignalSafe TreeSpec graph editor: canvas component, orchestration hook, and wiring to `@signalsafe/tree-spec-editor-core`.

| | |
|---|---|
| **npm** | `@signalsafe/tree-spec-editor-react` |
| **GitHub** | [SignalSafeSoftware/tree-spec-editor-react](https://github.com/SignalSafeSoftware/tree-spec-editor-react) |
| **Peer deps** | `react`, `react-dom`, `reactflow` (^18 / ^11) |

## What this package does

- Renders **`TreeSpecGraphEditor`** (React Flow canvas, custom nodes/edges, selection).
- Exposes **`useTreeSpecEditor`** for load/validate/autosave/publish orchestration (host injects adapter callbacks).
- Re-exports core editor types used by the hook.

## What this package does not do

- Sidebar panels, modals, toolbars, or Bootstrap chrome — use `@signalsafe/tree-spec-editor` or your own UI shell.
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

If you use `@signalsafe/tree-spec-editor` (Bootstrap shell), the canvas still comes from this package — consumers may need the CSS import in the app entry when tree-shaking.

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
            className="h-[60vh] border rounded"
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
| Bootstrap shell | `@signalsafe/tree-spec-editor` |

## Canvas selection behavior

| Selection | Inspector context | Contextual zoom (default on) |
|---|---|---|
| Node | selected node | fits node in viewport |
| Edge | source node + focused choice | viewport unchanged |
| Choice | `focusChoiceId` set | fits parent node when selected |

Pass `contextualZoom={false}` to disable automatic viewport fitting.

## Development

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
- [`@signalsafe/tree-spec-editor`](https://github.com/SignalSafeSoftware/tree-spec-editor) — full Bootstrap UI shell.
