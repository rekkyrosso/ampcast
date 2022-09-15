import React from 'react';
import listenbrainz from 'services/listenbrainz';
import MediaServiceSettings from './MediaServiceSettings';

export default function ListenBrainzSettings() {
    return <MediaServiceSettings service={listenbrainz} />;
}
