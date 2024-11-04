import React, {MouseEvent, useCallback, useState} from 'react';
import Icon from 'components/Icon';
import './CopyButton.scss';

export interface CopyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    onClick: () => Promise<void>;
}

export default function CopyButton({
    onClick,
    className = '',
    children = 'Copy',
    title = 'Copy to clipboard',
    ...props
}: CopyButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleCopyClick = useCallback(
        async (event: MouseEvent) => {
            try {
                const button = event.target as HTMLButtonElement;
                const width = getComputedStyle(button).width;
                const timerId = setTimeout(() => {
                    button.style.width = '';
                    setCopied(false);
                }, 5000);
                button.style.width = width;
                await onClick();
                setCopied(true);
                return () => clearTimeout(timerId);
            } catch (err) {
                console.error(err);
            }
        },
        [onClick]
    );

    return (
        <button
            {...props}
            className={`copy-button ${copied ? 'copied' : ''} ${className}`}
            type="button"
            onClick={handleCopyClick}
            title={copied ? 'Copied to clipboard' : title}
            disabled={copied}
        >
            <Icon name={copied ? 'clipboard-checked' : 'clipboard'} />
            <span className="text">{copied ? 'Copied' : children}</span>
        </button>
    );
}
