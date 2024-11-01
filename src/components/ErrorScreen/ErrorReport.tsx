import React, {useCallback} from 'react';
import {createErrorReport} from 'services/reporting';
import ErrorReportButton from './ErrorReportButton';
import './ErrorReport.scss';

export interface ErrorReportProps {
    error: any;
    reportedBy: 'BSOD' | 'MediaBrowser';
    reportingId?: string;
}

export default function ErrorReport({error, reportedBy, reportingId}: ErrorReportProps) {
    const handleReportClick = useCallback(async () => {
        const errorReport = createErrorReport(error, reportedBy, reportingId);
        await navigator.clipboard.writeText(JSON.stringify({errorReport}, undefined, 2));
    }, [error, reportedBy, reportingId]);

    return (
        <div className="error-report">
            <pre className="note error">{error?.message || String(error)}</pre>
            <p>
                <ErrorReportButton onClick={handleReportClick}>
                    {`Copy ${reportedBy === 'BSOD' ? 'crash' : 'error'} report`}
                </ErrorReportButton>
            </p>
        </div>
    );
}
