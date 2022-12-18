import React from 'react';
import MediaServiceSettings from 'components/Settings/MediaLibrarySettings/MediaServiceSettings';
import lastfm from '../lastfm';

export default function LastFmSettings() {
    return <MediaServiceSettings service={lastfm} />;
}
