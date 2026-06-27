# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-06-24

### Added

- `src/ui/editorClasses.ts` — shared `graph-editor-*` canvas class hooks and tone helpers.
- [docs/UI_KIT_AGNOSTIC_CANVAS.md](./docs/UI_KIT_AGNOSTIC_CANVAS.md) — canvas styling contract and migration guide.
- Tests: Bootstrap class denylist guard and `graph-editor-*` hook assertions.

### Changed

- **Breaking styling contract:** replace Bootstrap CSS classes on canvas nodes, lists, badges, toolbar, and context menu with `graph-editor-*` semantic hooks.
- Replace Bootstrap Icons (`bi bi-*`) with `graph-editor-icon` spans.
- Default `TreeSpecGraphEditor` container class: `graph-editor-canvas-root` (was `h-70vh border rounded`).
- Selection highlight: `graph-editor-canvas__selected` (was `bg-primary-subtle`).
- Issue borders: `graph-editor-canvas-node--border-warning` / `--border-danger`.

## [0.1.3] - 2026-06-26

### Fixed

- Clear monorepo `paths` from standalone `tsconfig.build.json` so local `yarn build` works outside the monorepo.

### Changed

- Standardize development on Yarn 1.22.22 (`packageManager`, README dev commands).
- Bump `@signalsafe/tree-spec` to `^0.3.2` and `@signalsafe/tree-spec-editor-core` to `^0.1.3`.

## [0.1.2] - 2026-06-26

### Added

- `SECURITY.md`, Dependabot, `CHANGELOG.md`, updated [RELEASING.md](./RELEASING.md).
- Expanded React package test coverage.
- Package artifact smoke test (`yarn smoke:package`).

### Changed

- `sideEffects` for React Flow CSS; README/CSS docs (Batch 4).

### CI

- Checks and tests on every PR; Sonar **`scan`** is label-gated on PRs and runs on tag push and manual dispatch (Batch 1).
- Publish only from manual **`main`** dispatch or **`v*`** tags (not PR labels); publish requires **`checks`**, **`tests`**, and **`scan`**.

[Unreleased]: https://github.com/SignalSafeSoftware/tree-spec-editor-react/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/SignalSafeSoftware/tree-spec-editor-react/compare/v0.1.3...v0.2.0
[0.1.3]: https://github.com/SignalSafeSoftware/tree-spec-editor-react/releases/tag/v0.1.3
[0.1.2]: https://github.com/SignalSafeSoftware/tree-spec-editor-react/releases/tag/v0.1.2
