import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export const TestRenderer = require("react-test-renderer") as typeof import("react-test-renderer");
export const act = TestRenderer.act;
