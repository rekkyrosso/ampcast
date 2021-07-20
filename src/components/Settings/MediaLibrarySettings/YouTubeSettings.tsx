import React from 'react';
import youtube from 'services/youtube';
import MediaServiceSettings from './MediaServiceSettings';

export default function YouTubeSettings() {
    return <MediaServiceSettings service={youtube} />;
}
