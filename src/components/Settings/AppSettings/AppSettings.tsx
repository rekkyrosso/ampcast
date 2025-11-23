import React from 'react';
import TabList, {TabItem} from 'components/TabList';
import AppSettingsGeneral from './AppSettingsGeneral';
import AppPreferences from './AppPreferences';
import AudioSettings from './AudioSettings';
import './AppSettings.scss';

const tabs: TabItem[] = [
    {
        tab: 'General',
        panel: <AppSettingsGeneral />,
    },
    {
        tab: 'Audio',
        panel: <AudioSettings />,
    },
    {
        tab: 'Preferences',
        panel: <AppPreferences />,
    },
];

export default function AppSettings() {
    return <TabList className="app-settings" items={tabs} label="App Settings" />;
}
