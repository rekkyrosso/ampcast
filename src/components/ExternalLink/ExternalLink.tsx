import React from 'react';
import Icon from 'components/Icon';
import './ExternalLink.scss';

export type ExternalLinkProps = JSX.IntrinsicElements['a'];

export default function ExternalLink({
    href,
    className = '',
    children = trimUrl(href),
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

function trimUrl(href: string | undefined): string | undefined {
    if (!href || href.length < 80) {
        return href;
    }
    const url = new URL(href);
    const path = url.pathname.split('/').pop();
    return path ? `${url.origin}/.../${path}` : url.origin;
}
