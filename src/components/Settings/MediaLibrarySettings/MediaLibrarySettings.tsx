import React, {useMemo} from 'react';
import TabList, {TabItem} from 'components/TabList';
import MediaLibrarySettingsGeneral from './MediaLibrarySettingsGeneral';
import LookupSettings from './LookupSettings';

export default function MediaLibrarySettings() {
    const tabs: TabItem[] = useMemo(
        () => [
            {
                tab: 'General',
                panel: <MediaLibrarySettingsGeneral />,
            },
            {
                tab: 'Lookup',
                panel: <LookupSettings />,
            },
        ],
        []
    );

    return <TabList className="media-library-settings" items={tabs} label="Media Services" />;
}
