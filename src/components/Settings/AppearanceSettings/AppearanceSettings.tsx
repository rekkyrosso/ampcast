import React from 'react';
import TabList, {TabItem} from 'components/TabList';
import AppearanceSettingsGeneral from './AppearanceSettingsGeneral';
import ThemeEditor from './ThemeEditor';

const tabs: TabItem[] = [
    {
        tab: 'General',
        panel: <AppearanceSettingsGeneral />,
    },
    {
        tab: 'Theme Editor',
        panel: <ThemeEditor />,
    },
];

export default function AppearanceSettings() {
    return <TabList className="appearance-settings" items={tabs} label="Appearance" />;
}
