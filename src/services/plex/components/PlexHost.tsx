import React from 'react';
import {PersonalMediaServerSettingsProps} from 'components/Settings/MediaLibrarySettings/PersonalMediaServerSettings';
import ExternalLink from 'components/ExternalLink';

const plexHost = 'https://app.plex.tv';

export default function PlexHost({service: plex}: PersonalMediaServerSettingsProps) {
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
