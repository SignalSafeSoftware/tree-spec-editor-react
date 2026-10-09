---
name: react-solid-principles
description: "Apply SOLID principles to React code by mapping them to components, custom hooks and functions. Use when designing, writing, refactoring or reviewing React components, hooks, props, context or wrapper components, or when the user asks about SOLID in React."
metadata:
  short-description: "SOLID principles for React components and hooks"
---

# SOLID Principles for React

SOLID in React shifts from classes to **components, custom hooks and functions**. Apply the principles pragmatically: split or abstract only when a concrete cost (hard to test, many reasons to change, edits in many files) justifies it.

## Principle map

| Principle | Core idea | React translation | Practical implementation |
|---|---|---|---|
| **S**ingle Responsibility | A component should do one thing well. | One reason to change per component or hook. | Extract logic into custom hooks; split large UI trees into small sub-components. |
| **O**pen/Closed | Open for extension, closed for modification. | Add behavior without editing existing components. | Use composition (`children`, slots, render props) instead of adding more conditional props; use per-item lookup tables instead of growing `switch` statements. |
| **L**iskov Substitution | Subtypes replace supertypes seamlessly. | A wrapper can stand in for the element or component it wraps. | Pass through native HTML attributes (`...rest`, `ComponentPropsWithoutRef<'button'>`), forward refs, and keep default behavior intact. |
| **I**nterface Segregation | Components should not depend on unused data. | Narrow props and narrow context. | Pass the individual primitives a component needs instead of whole objects; split wide context or host interfaces by capability. |
| **D**ependency Inversion | Depend on abstractions, not concrete implementations. | Components depend on injected capabilities. | Inject dependencies through context or props instead of importing API modules, `window`, `navigator` or storage directly. |

## Workflow

1. Identify the unit under change: component, hook, or helper function.
2. Check each principle below, report or fix only real violations, and keep the change minimal.
3. Preserve public props, exports and accessible behavior; do not add re-exports or compatibility wrappers.
4. Validate with the package's typecheck, lint, tests with coverage thresholds, build and format check.

## Checks per principle

**SRP**
- A component mixing data loading, state machines, validation and markup: move state and effects into a named hook, keep the component presentational.
- A file over the lint limit or a component with several unrelated `useState` groups: split by responsibility, not by line count.
- Pure logic (matching, mapping, formatting) belongs in plain functions that can be unit-tested without rendering.

**OCP**
- Boolean or enum props that switch whole layouts (`variant`, `mode`, `isX`, `isY`): prefer `children` or slot props.
- `switch` or `if` chains keyed on a closed set (app, channel, kind): use a typed `Record<Key, Handler>` so a new member is added in one place and the compiler flags gaps.
- Look up untrusted keys with an own-property check, not bare indexing.

**LSP**
- A wrapper around a native element must accept that element's attributes, spread them onto it, merge `className` and `style` rather than replace them, and forward `ref`.
- Do not narrow a base prop type (for example make an optional callback required) or change what an event handler receives.
- A component passed where another is expected (screen overrides, render slots) must honor the same props contract.

**ISP**
- Props that carry a large object when only one or two fields are read: pass those fields.
- Hooks returning many unrelated members: split them, or return only what callers use.
- A context or host interface that most consumers use a fraction of: split it so each consumer depends on only its capability.

**DIP**
- Components and hooks must not call `window.confirm`, `navigator.clipboard`, `fetch`, `localStorage`, `Date.now` or storage modules directly. Route them through one adapter and expose it through context or props with a browser default.
- Tests then supply fakes through the provider instead of spying on globals.
- Keep high-level policy (what to do) independent from infrastructure (how it is done).

## Report format

For each finding give: principle, file and symbol with line, evidence, proposed fix (smallest first), and confidence. State when a principle was checked and no violation was found. Do not report style preferences as violations.

## Notes for this ecosystem

- `simulator-react` owns reusable behavior and presentation, `simulator-device` owns composition, `simulator-core` owns domain contracts and has no React.
- Hosts inject behavior through providers such as `SimulatorAppsProvider`; prefer extending the host contract over importing a browser global.
- Do not add barrels, re-exports or alias wrappers; import from the declaring module.
- Companion skills: `solid-dry-review` (evidence scans), `strict-code-quality` (types, literals, smells).
