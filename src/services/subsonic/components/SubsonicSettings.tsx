import React from 'react';
import MediaServiceSettings from 'components/Settings/MediaLibrarySettings/MediaServiceSettings';
import subsonic from '../subsonic';

export default function SubsonicSettings() {
    return <MediaServiceSettings service={subsonic} />;
}
