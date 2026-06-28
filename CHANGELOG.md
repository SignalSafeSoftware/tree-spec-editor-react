# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-06-28

### Changed

- Removed Bootstrap-specific runtime styling assumptions from the React tree-spec editor components.
- Replaced Bootstrap class coupling with UI-kit-agnostic `graph-editor-*` class hooks.
- Updated internal SignalSafe dependency ranges for the current package release line:
  - `@signalsafe/tree-spec@^0.3.3`
  - `@signalsafe/tree-spec-editor-core@^0.1.4`
- Raised the supported Node.js baseline to Node 22.12+.

### Added

- Added tests to guard against reintroducing Bootstrap-specific class names or dependencies.
- Added package smoke checks for the built and packed artifact.

### Notes

- This release does not include `react-bootstrap` or `bootstrap`.
- Host applications are responsible for providing their own styling for the emitted `graph-editor-*` hooks.
- This package should be published before `@signalsafe/tree-spec-editor@0.3.0`.

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
