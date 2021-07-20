import React from 'react';
import spotify from 'services/spotify';
import MediaServiceSettings from './MediaServiceSettings';

export default function SpotifySettings() {
    return <MediaServiceSettings service={spotify} />;
}
