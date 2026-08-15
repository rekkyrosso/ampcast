import React, {useCallback} from 'react';
import {WEB_LINKS} from 'services/features';
import useHistory from 'components/MediaBrowser/useHistory';
import './InternalLink.scss';

export interface InternalLinkProps {
    path: string;
    children: React.ReactNode;
    className?: string;
}

export default function InternalLink({path, className, children}: InternalLinkProps) {
    const {currentPath, navigateTo} = useHistory();

    const handleClick = useCallback(() => {
        navigateTo(path);
    }, [navigateTo, path]);

    return !WEB_LINKS || isSamePath(path, currentPath) ? (
        <span className={className}>{children}</span>
    ) : (
        <a
            className={`internal-link ${className || ''}`}
            href={`#!/${path}`}
            tabIndex={-1}
            onClick={handleClick}
        >
            {children}
        </a>
    );
}

function isSamePath(path: string, currentPath: string): boolean {
    return path === currentPath || `pins/${path}` === currentPath;
}
