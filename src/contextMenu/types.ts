export type CanvasContextMenuState =
    | { kind: 'node'; nodeId: string; x: number; y: number }
    | { kind: 'pane'; x: number; y: number };
