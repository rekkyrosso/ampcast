import React from 'react';
import MediaServiceSettings from 'components/Settings/MediaLibrarySettings/MediaServiceSettings';
import youtube from '../youtube';

export default function YouTubeSettings() {
    return <MediaServiceSettings service={youtube} />;
}
