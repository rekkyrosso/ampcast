import React from 'react';
import TabList, {TabItem} from 'components/TabList';
import PlaylistSettingsGeneral from './PlaylistSettingsGeneral';

const tabs: TabItem[] = [
    {
        tab: 'General',
        panel: <PlaylistSettingsGeneral />,
    },
];

export default function PlaylistSettings() {
    return <TabList className="playlist-settings" items={tabs} label="Playlist Settings" />;
}
