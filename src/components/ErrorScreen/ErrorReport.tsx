import React, {useCallback} from 'react';
import {copyErrorReportToClipboard} from 'services/reporting';
import ReportButton from 'components/Button/ReportButton';
import './ErrorReport.scss';

export interface ErrorReportProps {
    error: any;
    reportedBy: 'BSOD' | 'MediaBrowser';
    reportingId?: string;
}

export default function ErrorReport({error, reportedBy, reportingId}: ErrorReportProps) {
    const handleCopyClick = useCallback(async () => {
        await copyErrorReportToClipboard(error, reportedBy, reportingId);
    }, [error, reportedBy, reportingId]);

    return (
        <div className="error-report">
            <pre className="note error">{error?.message || String(error)}</pre>
            <p>
                <ReportButton onClick={handleCopyClick}>
                    {`Copy ${reportedBy === 'BSOD' ? 'crash' : 'error'} report`}
                </ReportButton>
            </p>
        </div>
    );
}
