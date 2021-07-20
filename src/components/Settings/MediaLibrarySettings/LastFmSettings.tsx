import React from 'react';
import lastfm from 'services/lastfm';
import MediaServiceSettings from './MediaServiceSettings';

export default function LastFmSettings() {
    return <MediaServiceSettings service={lastfm} />;
}
