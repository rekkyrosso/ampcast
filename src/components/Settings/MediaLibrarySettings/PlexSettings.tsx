import React from 'react';
import plex from 'services/plex';
import MediaServiceSettings from './MediaServiceSettings';

export default function PlexSettings() {
    return <MediaServiceSettings service={plex} />;
}
