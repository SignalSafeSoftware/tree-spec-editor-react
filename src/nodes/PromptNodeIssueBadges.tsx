import { EDITOR_SPACING_ME_1, EDITOR_SPACING_MS_2, editorBadgeToneClass } from '../ui/editorClasses';

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
            className={EDITOR_SPACING_MS_2}
            title={`${issuesErrors} errors, ${issuesWarnings} warnings, ${issuesInfo} info`}
        >
            {issuesErrors > 0 ? (
                <span className={`${editorBadgeToneClass('danger')} ${EDITOR_SPACING_ME_1}`}>{issuesErrors}</span>
            ) : null}
            {issuesWarnings > 0 ? (
                <span className={`${editorBadgeToneClass('warning')} ${EDITOR_SPACING_ME_1}`}>{issuesWarnings}</span>
            ) : null}
            {issuesInfo > 0 ? <span className={editorBadgeToneClass('info')}>{issuesInfo}</span> : null}
        </span>
    );
}
