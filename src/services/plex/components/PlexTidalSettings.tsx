import React from 'react';
import MediaServiceSettingsGeneral from 'components/Settings/MediaLibrarySettings/MediaServiceSettingsGeneral';
import tidal from '../tidal';

export default function PlexTidalSettings() {
    return <MediaServiceSettingsGeneral service={tidal} />;
}
