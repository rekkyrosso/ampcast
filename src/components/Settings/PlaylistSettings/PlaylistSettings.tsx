import React from 'react';
import TabList, {TabItem} from 'components/TabList';
import PlaylistGeneralSettings from './PlaylistGeneralSettings';

const tabs: TabItem[] = [
    {
        tab: 'General',
        panel: <PlaylistGeneralSettings />,
    },
];

export default function PlaylistSettings() {
    return <TabList items={tabs} label="Playlist Settings" />;
}
