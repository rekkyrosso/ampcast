import React, {useMemo} from 'react';
import TabList, {TabItem} from 'components/TabList';
import MediaLibraryGeneralSettings from './MediaLibraryGeneralSettings';
import './MediaLibrarySettings.scss';

export default function MediaLibrarySettings() {
    const tabs: TabItem[] = useMemo(
        () => [
            {
                tab: 'General',
                panel: <MediaLibraryGeneralSettings />,
            },
        ],
        []
    );

    return <TabList items={tabs} label="Media Services" />;
}
