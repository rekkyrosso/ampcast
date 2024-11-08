import React, {useCallback} from 'react';
import {getReadableErrorMessage} from 'services/errors';
import {copyErrorReportToClipboard} from 'services/reporting';
import CopyButton from 'components/Button/CopyButton';
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
        </div>
    );
}
