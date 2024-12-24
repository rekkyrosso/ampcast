import React from 'react';
import Icon, {IconName} from 'components/Icon';
import './ExternalLink.scss';

export type ExternalLinkProps = React.JSX.IntrinsicElements['a'] & {
    icon?: IconName;
};

export default function ExternalLink({
    href,
    className = '',
    icon,
    rel = 'noopener',
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
            rel={rel}
        >
            <span className="external-link-content">
                {icon ? <Icon name={icon} /> : null}
                <span className="external-link-text">{children}</span>
            </span>
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
