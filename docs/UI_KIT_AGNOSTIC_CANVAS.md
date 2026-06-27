# Canvas UI-kit agnostic styling

**Package:** `@signalsafe/tree-spec-editor-react`  
**Status:** Implemented (0.2.0+)

---

## Summary

The React Flow canvas emits **semantic HTML** with stable **`graph-editor-*` class hooks**. It does **not** require Bootstrap CSS or Bootstrap Icons.

**Host applications own styling.** Map `graph-editor-*` classes in your theme (DeliveryPlus, Tailwind, MUI, etc.) or override via the `className` prop on `TreeSpecGraphEditor`.

Peer dependencies: `react`, `react-dom`, `reactflow` only.

---

## Class hooks

Canvas nodes, choices, toolbars, and context menus use tokens from `src/ui/editorClasses.ts` and `src/canvas/constants.ts`:

| Area | Example classes |
|------|-----------------|
| Canvas root | `graph-editor-canvas-root`, `graph-editor-canvas` |
| Node card | `graph-editor-card`, `graph-editor-canvas-node`, `graph-editor-card__header`, `graph-editor-card__body` |
| Selection | `graph-editor-canvas__selected`, `graph-editor-canvas-selected`, `graph-editor-canvas-choice-selected` |
| Issue borders | `graph-editor-canvas-node--border-danger`, `graph-editor-canvas-node--border-warning` |
| Lists / choices | `graph-editor-list`, `graph-editor-list__item`, `graph-editor-choice-row` |
| Badges | `graph-editor-badge`, `graph-editor-badge--danger` / `--warning` / `--info` |
| Toolbar | `graph-editor-btn-group`, `graph-editor-btn`, `graph-editor-btn--light` |
| Context menu | `graph-editor-context-menu`, `graph-editor-dropdown__menu`, `graph-editor-dropdown__item` |
| Handles | `graph-editor-target-handle`, `graph-editor-choice-handle` |

Text wrap helpers from `@signalsafe/tree-spec-editor-core` already use `graph-editor-node-text-*` classes.

---

## Host override strategy

1. **CSS bridge** — add host styles targeting `graph-editor-*` (recommended for DeliveryPlus migration).
2. **`className` prop** — pass layout/sizing classes on `TreeSpecGraphEditor` (default is `graph-editor-canvas-root`).
3. **Shell package** — `@signalsafe/tree-spec-editor` can map the same hooks to Bootstrap utilities in host SCSS.

This package ships **no CSS file**; `sideEffects: ["**/*.css"]` applies only to the React Flow stylesheet import.

---

## Migration from 0.1.x

| Before (0.1.x) | After (0.2.0) |
|----------------|---------------|
| `bg-primary-subtle` selection highlight | `graph-editor-canvas__selected` |
| `border-warning` / `border-danger` | `graph-editor-canvas-node--border-warning` / `--border-danger` |
| Bootstrap `card`, `list-group`, `btn`, `badge` | `graph-editor-card`, `graph-editor-list`, `graph-editor-btn`, `graph-editor-badge` |
| Default `className="h-70vh border rounded"` | Default `className="graph-editor-canvas-root"` |
| Bootstrap Icons (`bi bi-*`) | Unicode / `graph-editor-icon` spans |

**Semver:** minor (0.2.0) — DOM class contract change; component props unchanged.

---

## Related packages

- `@signalsafe/tree-spec-editor` — full authoring shell (UI-kit agnostic panels; host-owned Bootstrap optional)
- `@signalsafe/tree-spec-editor-core` — headless model and layout helpers
