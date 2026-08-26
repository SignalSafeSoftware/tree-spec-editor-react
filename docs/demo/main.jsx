import React from "react";
import { createRoot } from "react-dom/client";
import "reactflow/dist/style.css";
import "./editor-demo.css";

import { autoLayoutTree, patchGraphEditorMeta } from "@signalsafe/tree-spec-editor-core";
import TreeSpecGraphEditor from "../../dist/index.js";
import { incidentResponseEditorTree } from "./treeSpecExample.mjs";

const laidOutTree = patchGraphEditorMeta(autoLayoutTree(incidentResponseEditorTree), {
    viewport: { x: 36, y: 72, zoom: 0.82 },
});

function EditorDocumentationPreview() {
    return (
        <main className="docs-preview" id="editor-preview">
            <header className="docs-preview__header">
                <div>
                    <div className="docs-preview__eyebrow">TreeSpec editor</div>
                    <h1>Incident response decision tree</h1>
                </div>
                <div className="docs-preview__status">Read-only example</div>
            </header>
            <p className="docs-preview__description">
                Generated from the exported <code>TreeSpecGraphEditor</code> with the editor model and live
                example data.
            </p>
            <section className="docs-preview__canvas" aria-label="TreeSpec editor graph">
                <TreeSpecGraphEditor
                    tree={laidOutTree}
                    onChange={() => undefined}
                    readOnly
                    showMiniMap={false}
                    contextualZoom={false}
                    className="graph-editor-canvas-root"
                />
            </section>
        </main>
    );
}

createRoot(document.getElementById("root")).render(<EditorDocumentationPreview />);
