import { Position, NodeToolbar } from 'reactflow';

export function PromptNodeToolbar({
    nodeId,
    onDuplicateNode,
    onDeleteNode,
}: Readonly<{
    nodeId: string;
    onDuplicateNode: (id: string) => void;
    onDeleteNode: (id: string) => void;
}>) {
    return (
        <NodeToolbar isVisible position={Position.Bottom} offset={8} align="start">
            <fieldset className="btn-group btn-group-sm shadow-sm border-0 p-0 m-0">
                <legend className="visually-hidden">Node actions</legend>
                <button
                    type="button"
                    className="btn btn-light border"
                    title="Duplicate node"
                    aria-label="Duplicate node"
                    onClick={() => onDuplicateNode(nodeId)}
                >
                    <i className="bi bi-files" aria-hidden />
                </button>
                <button
                    type="button"
                    className="btn btn-light border text-danger"
                    title="Delete node"
                    aria-label="Delete node"
                    onClick={() => onDeleteNode(nodeId)}
                >
                    <i className="bi bi-trash" aria-hidden />
                </button>
            </fieldset>
        </NodeToolbar>
    );
}
