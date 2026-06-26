I reviewed the accessible files in `SignalSafeSoftware/tree-spec-editor-react`. Overall: **the package boundary is good, but this repo needs more consumer-facing docs, meaningful behavior tests, and safer release automation before I’d consider it stable public infrastructure.**

## Executive take

This package is doing the right job in the package stack: it is the **React + React Flow layer**, not the Bootstrap/full UI shell and not the pure core. The package metadata describes it as a “Headless React canvas” with no UI library, and its runtime dependencies/peers match that: it depends on your `tree-spec` and `tree-spec-editor-core` packages, while `react`, `react-dom`, and `reactflow` are peer dependencies.

The README clearly explains the split: this package renders the React Flow canvas and owns React state plumbing, while UI shells layer on top.  That is a strong architectural boundary.

The biggest gaps are:

1. **Tests are currently too shallow** from what I could see.
2. **README needs a real usage example with `TreeSpecGraphEditor` and `useTreeSpecEditor`.**
3. **CI/publish has the same risky PR-label publishing pattern as the other repos.**
4. **The package imports React Flow CSS directly despite `"sideEffects": false`.**
5. **Several places use `JSON.stringify` for change detection; this can become a performance/semantics issue.**
6. **No visible `SECURITY.md` or standalone `CHANGELOG.md`.**

## Documentation advice

Your README is good at explaining **where the package belongs**, but not yet good enough at explaining **how to use it**.

It currently covers ownership, selection behavior, peer installation, package layering, and why the package exists.   That is useful, but add runnable examples.

### 1. Add a minimal canvas example

Right now users see `TreeSpecGraphEditor` listed, but not used. Add this:

```tsx
import { useState } from "react";
import TreeSpecGraphEditor from "@signalsafe/tree-spec-editor-react";
import type { EditorTree, GraphSelection } from "@signalsafe/tree-spec-editor-core";
import "reactflow/dist/style.css";

const initialTree: EditorTree = {
  start_node: "start",
  nodes: {
    start: {
      id: "start",
      type: "prompt",
      prompt: "What do you do first?",
      choices: [{ id: "inspect", label: "Inspect sender" }],
      position: { x: 80, y: 80 },
    },
  },
  transitions: [],
};

export function ExampleEditor() {
  const [tree, setTree] = useState(initialTree);
  const [selected, setSelected] = useState<GraphSelection>({
    kind: null,
    id: null,
  });

  return (
    <TreeSpecGraphEditor
      tree={tree}
      onChange={setTree}
      selected={selected}
      onSelect={setSelected}
      showMiniMap
    />
  );
}
```

This matters because the component expects a full `EditorTree`, `onChange`, optional `issues`, selection, callbacks, focus props, read-only state, and canvas controls.

### 2. Add a `useTreeSpecEditor` adapter example

The hook has a fairly rich adapter contract: `getVersion` and `updateVersion` are required; validation, publish, snapshots, clone, and audit are optional.  The structured content shows that every method except `getVersion` and `updateVersion` is optional, but the README does not show a working adapter.

Add:

```tsx
import {
  TreeSpecGraphEditor,
  useTreeSpecEditor,
} from "@signalsafe/tree-spec-editor-react";

const adapter = {
  async getVersion(id: string) {
    const res = await fetch(`/api/scenario-versions/${id}`);
    if (!res.ok) return null;
    return res.json();
  },

  async updateVersion(id: string, payload: { tree_spec: Record<string, unknown> }) {
    const res = await fetch(`/api/scenario-versions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Save failed");
  },
};

export function ScenarioEditor({ versionId }: { versionId: string }) {
  const editor = useTreeSpecEditor({
    adapter,
    entityId: versionId,
  });

  if (editor.state.loading) return <p>Loading…</p>;
  if (!editor.state.tree) return <p>Could not load editor.</p>;

  return (
    <TreeSpecGraphEditor
      tree={editor.state.tree}
      onChange={editor.actions.setTree}
      issues={editor.state.issues}
      selected={editor.state.selection}
      onSelect={editor.actions.setSelection}
      focusNodeId={editor.state.focusNodeId}
      focusChoiceId={editor.state.focusChoiceId}
      fitViewNonce={editor.state.fitViewNonce}
      onChoiceSelect={editor.actions.selectChoice}
      onAutoLayout={editor.actions.autoLayout}
      readOnly={editor.state.isPublished}
    />
  );
}
```

### 3. Document CSS behavior more carefully

README says consumers must install `reactflow` and ship its CSS, but also says the package itself imports the CSS file from source.  The source does directly import `reactflow/dist/style.css`.

This can be surprising because `package.json` has `"sideEffects": false`.  CSS imports are side effects. I would either:

```json
"sideEffects": [
  "**/*.css",
  "reactflow/dist/style.css"
]
```

or remove the CSS import from the package and make the consuming app explicitly import it.

For libraries, I prefer **do not import peer CSS automatically**. Let the consuming app own it:

```tsx
import "reactflow/dist/style.css";
```

Then remove the source import and update README.

### 4. Add an “API boundary” section

The package comment says no Bootstrap, Material, Tailwind, router, or host routing dependencies.  This is good. Put it in README as a hard rule:

```md
## Boundary rules

This package may import:
- react
- reactflow
- @signalsafe/tree-spec
- @signalsafe/tree-spec-editor-core

This package must not import:
- react-bootstrap
- @mui/*
- react-router-dom
- next/router
- application API clients
```

### 5. Fix standalone repo links

README links to `../tree-spec-editor-core/README.md` and `../../docs/ai/packages-editor-architecture.md`.   In a standalone GitHub repo, those relative links may not resolve as intended. Use absolute GitHub links or add local docs.

## Test advice

The visible test coverage is too shallow. I could read `tests/index.test.ts`, and it only checks that the default export exists, `useTreeSpecEditor` exists, and UI-library components are not exported.  That is useful as a package-boundary test, but it does not prove the editor works.

Your Vitest config is already set up for JSX, React dedupe, CSS mocking, Node environment, and inlining local package dependencies.  That is a decent base, but you need behavior tests.

### 1. Test canvas edge building

`buildEdgesFromTransitions` and `buildTransitionsFromEdges` are pure-ish and highly testable. They convert TreeSpec editor transitions to React Flow edges and back, preserve prior outcomes for END edges, default missing END outcomes to `at_risk`, and filter invalid source handles.

Add tests for:

```ts
edgeLabelForTransition includes END outcome
buildEdgesFromTransitions uses choice label
buildEdgesFromTransitions hides label when choice hint says hide
buildTransitionsFromEdges preserves existing END outcome
buildTransitionsFromEdges defaults END outcome to at_risk
buildTransitionsFromEdges filters empty choice handles
buildTransitionsFromEdges drops edges from END
```

### 2. Test autosave

`useEditorAutosave` is small and critical. It compiles the tree, compares `JSON.stringify(compiled)` to the last-saved key, sets dirty state, and schedules `saveDraftRef.current()` after the debounce.

Use fake timers and test:

```ts
does nothing when autosave disabled
does nothing without entityId
does nothing for published versions
does nothing while saving/publishing
sets DIRTY and calls save after debounce
clears the timer when tree changes before debounce
does not reset debounce because autosaveStatus changes
```

### 3. Test adapter loading and validation

`useEditorAdapter` owns load, coercion, layout, local lint, validation, snapshots, audit, save, restore, and clone. It loads with `adapter.getVersion`, coerces the raw spec, decompiles, auto-layouts if needed, computes local issues, optionally queues validation, and tracks the last saved key.

The fetch output was truncated, but enough is visible to see this hook deserves tests. Add tests around:

```ts
loads valid wire and decompiles to tree
returns null tree on invalid wire
auto-layouts when needsInitialLayout returns true
does not validate published versions on initial load
validates drafts on initial load
maps adapter validation issues to TreeSpecIssue
parses thrown server errors via parseServerErrorMessage
saveDraft calls updateVersion with compiled TreeSpec
restoreSnapshot clears local edits and closes history
cloneToDraft calls onCloneNavigate
```

### 4. Test `TreeSpecGraphEditor` render safety

Use `react-test-renderer` or Testing Library. The package already has `react-test-renderer` as a dev dependency.  You can mock React Flow if needed.

Cover:

```ts
renders without UI-library imports
does not show MiniMap when showMiniMap=false
passes readOnly through to node context
calls onSelect for pane/node/edge interactions
does not select node when clicking a choice row
does not render editing affordances in readOnly mode
```

### 5. Add a tarball smoke test

The current tests import source directly via aliases.  Add one CI job that builds, packs, installs into a temporary app, and imports the built package.

```bash
yarn build
npm pack
mkdir /tmp/react-smoke
cd /tmp/react-smoke
npm init -y
npm install react react-dom reactflow /path/to/signalsafe-tree-spec-editor-react-*.tgz
node -e "import('@signalsafe/tree-spec-editor-react').then(m => console.log(typeof m.default, typeof m.useTreeSpecEditor))"
```

This catches broken `exports`, missing `dist`, missing declarations, and peer packaging issues.

## Security and release safety

### 1. Publishing from PR labels is risky

The workflow can publish on manual dispatch or on a pull request with a `publish` label, after checks/tests/scan succeed.  I would remove PR-triggered publish entirely.

Use tags or GitHub Releases:

```yaml
on:
  push:
    tags:
      - "tree-spec-editor-react-v*"
```

or manual publish from `main` only with an environment gate:

```yaml
environment: npm-production
permissions:
  contents: read
  id-token: write
```

### 2. PR checks are label-gated

Typecheck and tests run on push/manual, but for pull requests they run only if labels like `checks` or `tests` are present.  For this repo, I would run typecheck and tests on every PR. Keep Sonar gated if needed.

### 3. Add `SECURITY.md`

I did not find a visible `SECURITY.md`. Add one across all public packages, ideally with the same reporting email.

```md
# Security Policy

Please report vulnerabilities privately.

Email: security@signalsafe.software

Do not open public issues for suspected vulnerabilities.
```

### 4. Add Dependabot

This repo has meaningful peer/dev/runtime dependencies: React, React DOM, React Flow, `@signalsafe/tree-spec`, and `@signalsafe/tree-spec-editor-core`.  Add Dependabot for npm and GitHub Actions.

### 5. Consider React 19 compatibility

Peer deps currently require React `^18.0.0` only.  If you want this package to work for newer apps, test React 19 and loosen peer deps when verified:

```json
"react": "^18.0.0 || ^19.0.0",
"react-dom": "^18.0.0 || ^19.0.0"
```

Do not change this until you test it.

## Packaging advice

The package metadata is mostly strong: ESM, declaration output, `exports`, scoped public package, Node `>=18`, and limited published files.

I would change these:

### 1. Fix `sideEffects`

Because the source imports CSS, `"sideEffects": false` is probably not accurate.  Either remove the CSS import or mark CSS side effects.

Best option:

```tsx
// remove this from library source:
import "reactflow/dist/style.css";
```

Then document that the host must import it.

Second-best option:

```json
"sideEffects": [
  "**/*.css"
]
```

### 2. Add `packageManager`

CI uses Yarn and the repo likely has a Yarn lockfile. Add:

```json
"packageManager": "yarn@1.22.22"
```

### 3. Reconsider `prepare`

`prepare` runs `npm run build`.  This can surprise contributors and git installs. `prepublishOnly` is usually enough for npm publishing.

### 4. Mark monorepo-only scripts

`test:monorepo` points to `../../frontend`.  In the standalone repo, that path likely does not exist. Either remove it, document it as monorepo-only, or rename it:

```json
"test:monorepo:internal": "cd ../../frontend && yarn vitest run --config vitest.tree-spec-editor-react.config.ts"
```

## Code-quality observations

### 1. `TreeSpecGraphEditor.tsx` is getting large

The component owns context menu, issue indexing, drag/drop, graph state, node resizing, viewport, connections, selection, edge styling, mini-map, and rendering.

You already split much of the behavior into hooks, which is good. I would keep pushing in that direction. Specifically, extract:

```ts
useCanvasSelectionHandlers
useCanvasEdgePresentation
useCanvasContextValue
```

That would make the top-level component mostly wiring.

### 2. CSS class names imply Bootstrap

The package says no UI library, but `PromptNode` uses classes like `card`, `rounded`, `card-body`, `text-muted`, and custom class strings.  Those are Bootstrap-flavored. This may be okay if you intend “no dependency” rather than “no Bootstrap-style classes,” but it can make non-Bootstrap hosts inherit odd markup expectations.

Consider replacing Bootstrap-flavored class names with package-owned classes:

```tsx
<div className="ss-tree-node ss-tree-node--rounded">
```

Then ship or document minimal CSS variables/classes.

### 3. `JSON.stringify` change detection may become expensive

`useCanvasGraphState` uses:

```ts
const nextKey = JSON.stringify({ tree, issues: issues.length });
```

to decide whether to reset React Flow nodes/edges.

`useEditorAutosave` also stringifies compiled specs for dirty checking.  This is okay for small trees, but for larger scenarios it can become expensive and may be order-sensitive. A stable hash helper in `core` would be cleaner:

```ts
const key = stableTreeSpecKey(compiled);
```

### 4. Autosave errors are not visibly handled

`useEditorAutosave` calls `saveDraftRef.current?.()` but does not catch the promise.  `saveDraft` has a `finally`, but if it rejects, you likely want an error state/toast hook. The hook currently exposes lots of state, but I did not see an obvious `error` field in the visible type excerpt. Add a state field like:

```ts
lastError: string | null
```

or callbacks:

```ts
onError?: (error: unknown, context: "load" | "save" | "publish" | "validate") => void;
```

### 5. `TreeSpecGraphEditorProps.colorMode` mentions Bootstrap

The prop comment says the host should pass Bootstrap `colorScheme`.  Since this package is supposed to be UI-library-agnostic, rename the comment:

```ts
/** Canvas chrome mode used for data-color-mode styling. */
colorMode?: "light" | "dark";
```

## Architecture advice

Your layering makes sense:

* `@signalsafe/tree-spec`: format/types/compile/lint.
* `@signalsafe/tree-spec-editor-core`: pure editor model/helpers.
* `@signalsafe/tree-spec-editor-react`: React Flow canvas + React orchestration.
* `@signalsafe/tree-spec-editor`: Bootstrap shell.

This package correctly avoids exporting UI shell components; the barrel test enforces that.

The one architectural gray area is that `useTreeSpecEditor` is more than just canvas; it owns loading, autosave, validation, publish, snapshots, audit, clone-to-draft, selection, focus, node/choice operations, and keyboard shortcuts. The hook comment explicitly says that.

That is not necessarily wrong, but it makes this package a **headless editor application hook**, not merely a React canvas. I would document that distinction:

```md
This package exports two layers:
- `TreeSpecGraphEditor`: canvas-only component.
- `useTreeSpecEditor`: optional headless application-state hook.
```

That will prevent future confusion.

## Priority checklist

I’d do this order:

1. **Remove PR-label publishing**; publish only from tags/releases/manual `main` with approval.
2. **Run typecheck/tests on every PR**, not only label-gated PRs.
3. **Add real README usage examples** for both `TreeSpecGraphEditor` and `useTreeSpecEditor`.
4. **Fix CSS side effects**: remove library CSS import or update `sideEffects`.
5. **Add behavior tests** for edge building, autosave, adapter load/save/validate, selection, and render safety.
6. **Add tarball smoke test** in CI.
7. **Add `SECURITY.md` and `CHANGELOG.md`.**
8. **Clarify Bootstrap-ish class usage** or move to package-owned CSS classes.
9. **Add an error reporting surface** to the hook for save/load/validate/publish failures.
10. **Consider React 19 peer compatibility** after testing.

My honest assessment: **the repo has the right architecture and package metadata, but the tests and docs are not yet strong enough for a public reusable React package. The biggest actual risk is release automation; the biggest usability gap is examples.**
