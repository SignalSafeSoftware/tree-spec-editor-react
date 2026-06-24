export function PromptNodeIssueBadges({
    issuesTotal,
    issuesErrors,
    issuesWarnings,
    issuesInfo,
}: Readonly<{
    issuesTotal: number;
    issuesErrors: number;
    issuesWarnings: number;
    issuesInfo: number;
}>) {
    if (issuesTotal <= 0) return null;
    return (
        <span
            className="ms-2"
            title={`${issuesErrors} errors, ${issuesWarnings} warnings, ${issuesInfo} info`}
        >
            {issuesErrors > 0 ? <span className="badge bg-danger me-1">{issuesErrors}</span> : null}
            {issuesWarnings > 0 ? (
                <span className="badge bg-warning text-dark me-1">{issuesWarnings}</span>
            ) : null}
            {issuesInfo > 0 ? <span className="badge bg-info text-dark">{issuesInfo}</span> : null}
        </span>
    );
}
