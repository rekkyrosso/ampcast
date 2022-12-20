import React, {useMemo} from 'react';
import TabList, {TabItem} from 'components/TabList';
import MediaServiceSettingsGeneral from 'components/Settings/MediaLibrarySettings/MediaServiceSettingsGeneral';
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
                tab: 'Beta',
                panel: <AppleBetaSettings />,
            },
        ],
        []
    );

    return <TabList items={tabs} label={apple.name} />;
}
