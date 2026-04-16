import React, {useCallback} from 'react';
import {getReadableErrorMessage} from 'services/errors';
import {copyErrorReportToClipboard} from 'services/reporting';
import {CopyButton} from 'components/Button';
import ExternalLink from 'components/ExternalLink';
import './ErrorReport.scss';

export interface ErrorReportProps {
    error: any;
    reportedBy: string;
    reportingId?: string;
}

export default function ErrorReport({error, reportedBy, reportingId}: ErrorReportProps) {
    const handleCopyClick = useCallback(async () => {
        await copyErrorReportToClipboard(error, reportedBy, reportingId);
    }, [error, reportedBy, reportingId]);

    return (
        <div className="error-report">
            <pre className="note error">{getReadableErrorMessage(error)}</pre>
            <p>
                <CopyButton onClick={handleCopyClick}>
                    {`Copy ${reportedBy === 'BSOD' ? 'crash' : 'error'} report`}
                </CopyButton>
            </p>
            <ContextualHelp error={error} reportedBy={reportedBy} reportingId={reportingId} />
        </div>
    );
}

function ContextualHelp({error, reportingId}: ErrorReportProps) {
    if (error?.status === 403 && reportingId?.startsWith('lastfm/')) {
        return <LastFMForbiddenHelp />;
    }
}

function LastFMForbiddenHelp() {
    return (
        <div className="note help">
            <p>
                This error is usually caused by your{' '}
                <ExternalLink href="https://www.last.fm/settings/privacy">
                    privacy settings
                </ExternalLink>
                .
            </p>
            <p>Ensure that &quot;Hide recent listening information&quot; is unchecked.</p>
        </div>
    );
}
