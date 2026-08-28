# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.5] - 2026-08-28

### Added

- A package-boundary test that verifies every external runtime import is declared and Bootstrap remains excluded.

### Changed

- Require `@signalsafe/tree-spec` **^0.3.4** and `@signalsafe/tree-spec-editor-core` **^0.1.6**.
- Raise the minimum supported Node.js to **>=22.12.0** and run the CI matrix on Node **22** and **24** only; Node 20 is dropped because of GitHub Actions deprecation.

## [0.2.4] - 2026-08-28

### Fixed

- Verify generated documentation images with a stable fingerprint of the live demo, compiled editor modules, and stylesheet inputs while still rendering the real component tree in CI.

## [0.2.3] - 2026-08-28

### Fixed

- Generate the live-canvas documentation SVG from versioned CSS source files instead of browser-normalized CSS so the checked-in image is reproducible on macOS and Linux CI.

## [0.2.2] - 2026-08-28

### Added

- A live-canvas documentation demo and generated TreeSpec example-flow SVG.

### Changed

- Updated the TypeScript 7-compatible build configuration and current CI action dependencies.

## [0.2.1] - 2026-06-28

### Fixed

- Removed the React Flow CSS side-effect import from the built library entrypoint so native Node ESM package imports do not fail on `.css` files.

### Notes

- Host applications that want React Flow default styling should import `reactflow/dist/style.css` from their own app entrypoint.
- No React component API changes.
- No Bootstrap or UI framework dependencies were added.

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

### Fixed

- Addressed SonarCloud maintainability findings by marking graph editor canvas component props as read-only across prompt/end node renderers, choice rows, the canvas context menu, and the main editor shell.
- Addressed SonarCloud consistency findings by using `export…from` for public barrel re-exports.

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

[Unreleased]: https://github.com/SignalSafeSoftware/tree-spec-editor-react/compare/v0.2.5...HEAD
[0.2.5]: https://github.com/SignalSafeSoftware/tree-spec-editor-react/compare/v0.2.4...v0.2.5
[0.2.4]: https://github.com/SignalSafeSoftware/tree-spec-editor-react/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/SignalSafeSoftware/tree-spec-editor-react/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/SignalSafeSoftware/tree-spec-editor-react/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/SignalSafeSoftware/tree-spec-editor-react/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/SignalSafeSoftware/tree-spec-editor-react/compare/v0.1.3...v0.2.0
[0.1.3]: https://github.com/SignalSafeSoftware/tree-spec-editor-react/releases/tag/v0.1.3
[0.1.2]: https://github.com/SignalSafeSoftware/tree-spec-editor-react/releases/tag/v0.1.2
