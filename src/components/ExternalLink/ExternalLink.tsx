import React from 'react';
import './ExternalLink.scss';

export type ExternalLinkProps = JSX.IntrinsicElements['a'];

export default function ExternalLink({href, children = href, ...props}: ExternalLinkProps) {
    return (
        <span className="external-link">
            {/* eslint-disable-next-line react/jsx-no-target-blank */}
            <a {...props} href={href} target="_blank" rel="noopener">
                {children}
            </a>
        </span>
    );
}
