import React, {useCallback} from 'react';
import LinkBehavior from 'types/LinkBehavior';
import {browser, preventDefault} from 'utils';
import preferences from 'services/preferences';
import useHistory from 'components/MediaBrowser/useHistory';
import './InternalLink.scss';

export interface InternalLinkProps {
    path: string;
    children: React.ReactNode;
    className?: string;
}

export default function InternalLink({path, className = '', children}: InternalLinkProps) {
    const {currentPath, navigateTo} = useHistory();

    const handleClick = useCallback(
        (event: React.MouseEvent) => {
            if (event.button === 0) {
                event.preventDefault();
                if (
                    event[browser.cmdKey] ||
                    preferences.linkBehavior === LinkBehavior.Always ||
                    (preferences.linkBehavior === LinkBehavior.CmdKeyDetails &&
                        !(event.target as HTMLElement).closest('.list-view-details'))
                ) {
                    event.stopPropagation();
                    navigateTo(path);
                }
            }
        },
        [navigateTo, path]
    );

    return isSamePath(path, currentPath) ? (
        <span className={className}>{children}</span>
    ) : (
        <a
            className={`internal-link ${className}`}
            href={`#!/${path}`}
            tabIndex={-1}
            onClick={handleClick}
            onAuxClick={preventDefault}
        >
            {children}
        </a>
    );
}

function isSamePath(path: string, currentPath: string): boolean {
    return path === currentPath || `pins/${path}` === currentPath;
}
