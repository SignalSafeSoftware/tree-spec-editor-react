import { END_NODE_ID } from "@signalsafe/tree-spec-editor-core";

/**
 * Single source of truth for the editor documentation preview.
 *
 * This is the authoring graph shape consumed by TreeSpecGraphEditor rather
 * than the compiled wire format, so the preview exercises the editor model
 * and its terminal END node directly.
 */
export const incidentResponseEditorTree = {
    start_node: "triage",
    nodes: {
        triage: {
            id: "triage",
            type: "prompt",
            prompt: "An employee reports a suspicious attachment. What is the first response?",
            choices: [
                {
                    id: "investigate",
                    label: "Investigate the email headers and isolate the device",
                },
                {
                    id: "dismiss",
                    label: "Assume it is harmless and dismiss the report",
                },
            ],
        },
        investigate: {
            id: "investigate",
            type: "prompt",
            prompt: "The attachment contacted an unknown host. What do you do next?",
            choices: [
                {
                    id: "escalate",
                    label: "Escalate to incident response and preserve evidence",
                },
                {
                    id: "reimage",
                    label: "Reimage immediately without collecting evidence",
                },
            ],
        },
        recovery: {
            id: "recovery",
            type: "info",
            prompt: "Notify stakeholders, document the timeline, and restore the endpoint safely.",
            choices: [{ id: "close", label: "Close incident" }],
        },
    },
    transitions: [
        {
            id: "triage-investigate",
            fromNodeId: "triage",
            fromChoiceId: "investigate",
            toNodeId: "investigate",
        },
        {
            id: "triage-dismiss",
            fromNodeId: "triage",
            fromChoiceId: "dismiss",
            toNodeId: END_NODE_ID,
            outcome: "compromised",
        },
        {
            id: "investigate-escalate",
            fromNodeId: "investigate",
            fromChoiceId: "escalate",
            toNodeId: "recovery",
        },
        {
            id: "investigate-reimage",
            fromNodeId: "investigate",
            fromChoiceId: "reimage",
            toNodeId: END_NODE_ID,
            outcome: "at_risk",
        },
        {
            id: "recovery-close",
            fromNodeId: "recovery",
            fromChoiceId: "close",
            toNodeId: END_NODE_ID,
            outcome: "safe",
        },
    ],
};
