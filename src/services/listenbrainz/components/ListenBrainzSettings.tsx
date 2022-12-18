import React from 'react';
import MediaServiceSettings from 'components/Settings/MediaLibrarySettings/MediaServiceSettings';
import listenbrainz from '../listenbrainz';

export default function ListenBrainzSettings() {
    return <MediaServiceSettings service={listenbrainz} />;
}
