import React from 'react';
import jellyfin from 'services/jellyfin';
import MediaServiceSettings from './MediaServiceSettings';

export default function JellyfinSettings() {
    return <MediaServiceSettings service={jellyfin} />;
}
