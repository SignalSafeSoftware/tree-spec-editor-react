# Releasing @signalsafe/tree-spec-editor-react

Headless React Flow canvas for the TreeSpec editor (`npm install @signalsafe/tree-spec-editor-react`).

**Depends on:** `@signalsafe/tree-spec` and `@signalsafe/tree-spec-editor-core` (publish those first). **Peers:** `react`, `react-dom`, `reactflow`.

**Monorepo source of truth:** `packages/tree-spec-editor-react` in [DeliveryPlus](https://github.com/SignalSafeSoftware/DeliveryPlus).

## One-time setup

```bash
bash scripts/push-standalone-npm-package.sh tree-spec-editor-react --create-repo
```

Remote: `https://github.com/SignalSafeSoftware/tree-spec-editor-react` (use SSH for `git push`).

## Release workflow

1. Develop in `packages/tree-spec-editor-react`.
2. Align dependency versions for `@signalsafe/tree-spec` and `@signalsafe/tree-spec-editor-core`.
3. Bump `package.json` version.
4. Test: `npm ci && npm test && npm run build`.
5. Sync: `bash scripts/push-standalone-npm-package.sh tree-spec-editor-react`
6. Publish: `npm publish --access public` or GitHub **Release** (triggers `publish.yml`).

## Pre-release checks

```bash
npm ci
npm run typecheck
npm test
npm run build
npm publish --dry-run
```

Tarball should include `package.json`, `README.md`, `LICENSE`, and `dist/**` only.
