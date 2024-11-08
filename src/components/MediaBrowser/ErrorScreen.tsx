import React from 'react';
import ErrorBox, {ErrorBoxProps} from 'components/Errors/ErrorBox';

export default function ErrorScreen(props: ErrorBoxProps) {
    return (
        <div className="panel error-screen">
            <ErrorBox reportedBy="MediaBrowser" {...props} />
        </div>
    );
}
