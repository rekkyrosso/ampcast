import React, {useMemo} from 'react';
import TabList, {TabItem} from 'components/TabList';
import MediaServiceSettingsGeneral from 'components/Settings/MediaLibrarySettings/MediaServiceSettingsGeneral';
import PinnedSettings from 'components/Settings/MediaLibrarySettings/PinnedSettings';
import EmbyLibrarySettings from 'services/emby/components/EmbyLibrarySettings';
import jellyfinSettings from '../jellyfinSettings';
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
                panel: <EmbyLibrarySettings service={jellyfin} settings={jellyfinSettings} />,
            },
        ],
        []
    );

    return (
        <TabList
            className="media-service-settings jellyfin-settings"
            items={tabs}
            label={jellyfin.name}
        />
    );
}
