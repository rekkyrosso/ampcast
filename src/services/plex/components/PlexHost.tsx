import React from 'react';
import ExternalLink from 'components/ExternalLink';
import {PlexMediaLibrarySettingsProps} from './PlexMediaLibrarySettings';

const plexHost = 'https://app.plex.tv';

export default function PlexHost({service: plex}: PlexMediaLibrarySettingsProps) {
    const host = plex.host;
    return host ? (
        /plex\.direct/.test(host) ? (
            <ExternalLink href={plexHost} title={host}>
                {plexDirectUrl(host)}
            </ExternalLink>
        ) : (
            <ExternalLink href={host} />
        )
    ) : (
        'Not configured'
    );
}

function plexDirectUrl(host: string): string {
    try {
        const {protocol, port} = new URL(host);
        return `${protocol}//***.plex.direct:${port}`;
    } catch {
        return plexHost;
    }
}
