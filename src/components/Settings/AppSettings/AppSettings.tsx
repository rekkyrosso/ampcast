import React from 'react';
import TabList, {TabItem} from 'components/TabList';
import AppSettingsGeneral from './AppSettingsGeneral';
import './AppSettings.scss';

const tabs: TabItem[] = [
    {
        tab: 'General',
        panel: <AppSettingsGeneral />,
    },
];

export default function AppSettings() {
    return <TabList className="app-settings" items={tabs} label="App Settings" />;
}
