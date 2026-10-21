---
name: solid-dry-review
description: "Run an evidence-based, read-only SOLID and DRY review of a TypeScript/React package using measured duplication, file size, switch-on-type, and direct-global scans. Use when the user asks whether code violates SOLID or DRY, or wants a ranked list of structural duplication and design-principle debt."
metadata:
  short-description: "Evidence-based SOLID and DRY review"
---

# SOLID and DRY Review

Read-only by default. Report findings; change code only if the user asks for remediation in the same request.

## Workflow

1. Scope the packages and list each package's entry points and public API.
2. Run the scans below, then read the flagged code. A scan hit is a lead, not a finding.
3. Keep only findings that name a concrete repeated piece of knowledge or a concrete cost (an edit that must touch many files, a test that must spy on a global).
4. Rank by blast radius and how cheap the fix is.

## Scans

Quote globs and use `--include='*.ts'` style flags under zsh.

- **Exact clones:** `npx --yes jscpd --min-lines 10 --reporters console src`. Low counts are normal; structural repetition is the usual DRY problem.
- **Large files (SRP):** list `src` files over about 300 lines, then read the biggest for mixed responsibilities such as view plus pure logic, or mappers for many features.
- **Switches on a closed set (OCP):** grep for `switch \(` keyed on app, channel, kind, or type. Many switches over one set mean a new member needs edits in many places; propose a per-member registry or strategy.
- **Direct globals (DIP):** grep for `window.confirm`, `navigator.clipboard`, `Date.now`, `localStorage`, and `fetch` in components and hooks. Flag those that are not injectable and force tests to spy on globals.
- **Wide interfaces (ISP):** read host, context, and props interfaces and hooks that return large objects. Flag members most consumers never use.
- **Repeated patterns:** grep for the same expression shape in several files, for example dirty-check `JSON.stringify(a) === JSON.stringify(b)` (also the `!==` form), stale-request counters like `generation.current`, repeated retry or load-more footers, repeated style-class helper calls, and `settle =` style test helpers.
- **Duplicate shapes and helpers:** search for repeated local constants across files, including between `src`, `tests`, and `examples`.
- **Inline imports:** grep for `import\(` and `typeof import` in `src`, and for `import` statements that appear after the first declaration. Replace with a top-level `import type`.
- **Inline types:** grep for anonymous object types in signatures, props, and generics, such as `): { a: T }`, `Array<{ ... }>`, and `Readonly<{ ... }>` on exported components. Name them when they are exported, reused, or longer than a line; a single-use private props type is acceptable.
- **Repeated string literals:** count quoted literals of 4 or more characters per package with `grep -rhoE "'[A-Za-z][A-Za-z0-9_.:/ -]{3,}'" src | sort | uniq -c | sort -rn`. A literal that repeats and belongs to a closed set (app ids, channels, statuses, event or field names) should become an enum or `as const` object. Also flag repeated i18n keys and CSS class strings, but only when they carry shared meaning. Ignore import specifiers, ARIA attribute names, and one-off user-facing text.

## Judging findings

- DRY applies to duplicated knowledge, not look-alike code. Do not merge two things that change for different reasons.
- SOLID is applied pragmatically: split a file only when it holds separate reasons to change; add an interface only at a real boundary.
- LSP needs evidence (a subtype that narrows behavior or throws where the base does not). Say none was found when none was found.
- Check that a proposed shared helper has a natural owner package and does not add a dependency cycle between packages.

## Report format

Group by DRY, SRP, OCP, ISP, DIP, LSP, then Types and literals (inline imports, inline types, repeated literals). For each finding give file path with line, the evidence, the proposed fix, and a confidence level. Finish with the cheapest high-value fixes first and state that no code was changed.

## If remediation is requested

Keep behavior and public API stable. Run the package's typecheck, lint, tests with coverage thresholds, build, and format check. Do not tag or publish.
