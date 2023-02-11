import Icon from 'components/Icon';
import React from 'react';
import './ExternalLink.scss';

export type ExternalLinkProps = JSX.IntrinsicElements['a'];

export default function ExternalLink({
    href,
    className = '',
    children = href,
    ...props
}: ExternalLinkProps) {
    return (
        /* eslint-disable-next-line react/jsx-no-target-blank */
        <a
            {...props}
            className={`external-link ${className}`}
            href={href}
            target="_blank"
            rel="noopener"
        >
            <span className="external-link-text">{children}</span>
            <Icon name="link" />
        </a>
    );
}
