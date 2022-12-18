import React from 'react';
import MediaServiceSettings from 'components/Settings/MediaLibrarySettings/MediaServiceSettings';
import jellyfin from '../jellyfin';

export default function JellyfinSettings() {
    return <MediaServiceSettings service={jellyfin} />;
}
