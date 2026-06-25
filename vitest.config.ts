import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    esbuild: {
        jsx: "automatic",
        jsxDev: false,
    },
    resolve: {
        dedupe: ["react", "react-dom", "react-test-renderer"],
        alias: [
            {
                find: "reactflow/dist/style.css",
                replacement: path.resolve(packageRoot, "tests/support/empty-module.ts"),
            },
            {
                find: "@signalsafe/tree-spec-editor-react",
                replacement: path.resolve(packageRoot, "src/index.ts"),
            },
            {
                find: /^@signalsafe\/tree-spec-editor-react\/(.+)$/,
                replacement: path.resolve(packageRoot, "src") + "/$1",
            },
        ],
    },
    test: {
        environment: "node",
        include: ["tests/**/*.test.ts"],
        coverage: {
            provider: "v8",
            include: ["src/**"],
            exclude: ["src/**/*.d.ts"],
            reporter: ["text", "lcov"],
            reportsDirectory: "coverage",
        },
        server: {
            deps: {
                inline: ["@signalsafe/tree-spec-editor-core", "@signalsafe/tree-spec"],
            },
        },
    },
});
