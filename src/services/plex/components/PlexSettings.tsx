import React from 'react';
import MediaServiceSettings from 'components/Settings/MediaLibrarySettings/MediaServiceSettings';
import plex from '../plex';

export default function PlexSettings() {
    return <MediaServiceSettings service={plex} />;
}
