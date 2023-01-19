import React, {useMemo} from 'react';
import TabList, {TabItem} from 'components/TabList';
import MediaServiceSettingsGeneral from 'components/Settings/MediaLibrarySettings/MediaServiceSettingsGeneral';
import PinnedSettings from 'components/Settings/MediaLibrarySettings/PinnedSettings';
import AppleBetaSettings from './AppleBetaSettings';
import apple from '../apple';

export default function AppleSettings() {
    const tabs: TabItem[] = useMemo(
        () => [
            {
                tab: 'General',
                panel: <MediaServiceSettingsGeneral service={apple} />,
            },
            {
                tab: 'Pinned',
                panel: <PinnedSettings service={apple} />,
            },
            {
                tab: 'Beta',
                panel: <AppleBetaSettings />,
            },
        ],
        []
    );

    return (
        <TabList
            className="media-service-settings apple-settings"
            items={tabs}
            label={apple.name}
        />
    );
}
