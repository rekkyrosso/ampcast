import React, {useMemo} from 'react';
import TabList, {TabItem} from 'components/TabList';
import MediaServiceSettingsGeneral from 'components/Settings/MediaLibrarySettings/MediaServiceSettingsGeneral';
import PinnedSettings from 'components/Settings/MediaLibrarySettings/PinnedSettings';
import JellyfinLibrarySettings from './JellyfinLibrarySettings';
import jellyfin from '../jellyfin';

export default function JellyfinSettings() {
    const tabs: TabItem[] = useMemo(
        () => [
            {
                tab: 'General',
                panel: <MediaServiceSettingsGeneral service={jellyfin} />,
            },
            {
                tab: 'Pinned',
                panel: <PinnedSettings service={jellyfin} />,
            },
            {
                tab: 'Library',
                panel: <JellyfinLibrarySettings />,
            },
        ],
        []
    );

    return (
        <TabList className="media-service-settings jellyfin-settings" items={tabs} label={jellyfin.name} />
    );
}
