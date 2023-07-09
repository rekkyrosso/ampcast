import React, {useMemo} from 'react';
import TabList, {TabItem} from 'components/TabList';
import MediaServiceSettingsGeneral from 'components/Settings/MediaLibrarySettings/MediaServiceSettingsGeneral';
import PinnedSettings from 'components/Settings/MediaLibrarySettings/PinnedSettings';
import EmbyLibrarySettings from './EmbyLibrarySettings';
import embySettings from '../embySettings';
import emby from '../emby';

export default function EmbySettings() {
    const tabs: TabItem[] = useMemo(
        () => [
            {
                tab: 'General',
                panel: <MediaServiceSettingsGeneral service={emby} />,
            },
            {
                tab: 'Pinned',
                panel: <PinnedSettings service={emby} />,
            },
            {
                tab: 'Library',
                panel: <EmbyLibrarySettings service={emby} settings={embySettings} />,
            },
        ],
        []
    );

    return (
        <TabList className="media-service-settings emby-settings" items={tabs} label={emby.name} />
    );
}
