import React from 'react';

export type ExternalLinkProps = JSX.IntrinsicElements['a'];

export default function ExternalLink({href, children = href, ...props}: ExternalLinkProps) {
    return (
        // eslint-disable-next-line react/jsx-no-target-blank
        <a {...props} href={href} target="_blank" rel="noopener">
            {children}
        </a>
    );
}
