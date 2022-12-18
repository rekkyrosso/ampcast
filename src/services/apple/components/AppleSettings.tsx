import React, {useMemo} from 'react';
import TabList, {TabItem} from 'components/TabList';
import MediaServiceGeneralSettings from 'components/Settings/MediaLibrarySettings/MediaServiceGeneralSettings';
import AppleBetaSettings from './AppleBetaSettings';
import apple from '../apple';

export default function AppleSettings() {
    const tabs: TabItem[] = useMemo(
        () => [
            {
                tab: 'General',
                panel: <MediaServiceGeneralSettings service={apple} />,
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
