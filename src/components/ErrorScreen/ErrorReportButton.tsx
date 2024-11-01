import React, {useCallback, useState} from 'react';
import Icon from 'components/Icon';
import './ErrorReportButton.scss';

export interface ErrorReportButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    onClick: () => Promise<void>;
}

export default function ErrorReportButton({
    onClick,
    children = 'Copy error report',
    title = 'Copy to clipboard',
    ...props
}: ErrorReportButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleCopyClick = useCallback(async () => {
        try {
            await onClick();
            setCopied(true);
        } catch (err) {
            console.error(err);
        }
    }, [onClick]);

    return (
        <button
            {...props}
            className="error-report-button"
            type="button"
            onClick={handleCopyClick}
            title={title}
        >
            <Icon name={copied ? 'clipboard-checked' : 'clipboard'} />
            <span className="text">{children}</span>
        </button>
    );
}
