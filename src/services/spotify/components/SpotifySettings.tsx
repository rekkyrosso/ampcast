import React from 'react';
import MediaServiceSettings from 'components/Settings/MediaLibrarySettings/MediaServiceSettings';
import spotify from '../spotify';

export default function SpotifySettings() {
    return <MediaServiceSettings service={spotify} />;
}
