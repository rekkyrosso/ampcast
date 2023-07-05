import React from 'react';
import MediaServiceSettings from 'components/Settings/MediaLibrarySettings/MediaServiceSettings';
import navidrome from '../navidrome';

export default function NavidromeSettings() {
    return <MediaServiceSettings service={navidrome} />;
}
