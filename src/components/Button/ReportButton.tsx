import React, {useCallback, useState} from 'react';
import Icon from 'components/Icon';
import './ReportButton.scss';

export interface ReportButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    onClick: () => Promise<void>;
}

export default function ReportButton({
    onClick,
    children = 'Copy report',
    title = 'Copy to clipboard',
    ...props
}: ReportButtonProps) {
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
            className="report-button"
            type="button"
            onClick={handleCopyClick}
            title={title}
        >
            <Icon name={copied ? 'clipboard-checked' : 'clipboard'} />
            <span className="text">{children}</span>
        </button>
    );
}
