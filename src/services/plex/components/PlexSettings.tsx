import React, {useMemo} from 'react';
import TabList, {TabItem} from 'components/TabList';
import MediaServiceSettingsGeneral from 'components/Settings/MediaLibrarySettings/MediaServiceSettingsGeneral';
import PinnedSettings from 'components/Settings/MediaLibrarySettings/PinnedSettings';
import PlexLibrarySettings from './PlexLibrarySettings';
import plex from '../plex';

export default function PlexSettings() {
    const tabs: TabItem[] = useMemo(
        () => [
            {
                tab: 'General',
                panel: <MediaServiceSettingsGeneral service={plex} />,
            },
            {
                tab: 'Pinned',
                panel: <PinnedSettings service={plex} />,
            },
            {
                tab: 'Library',
                panel: <PlexLibrarySettings />,
            },
        ],
        []
    );

    return (
        <TabList className="media-service-settings plex-settings" items={tabs} label={plex.name} />
    );
}
