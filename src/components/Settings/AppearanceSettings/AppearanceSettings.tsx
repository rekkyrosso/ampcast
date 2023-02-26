import React from 'react';
import TabList, {TabItem} from 'components/TabList';
import AppearanceSettingsGeneral from './AppearanceSettingsGeneral';
import ThemeEditor from './ThemeEditor';
import UserThemes from './UserThemes';

const tabs: TabItem[] = [
    {
        tab: 'General',
        panel: <AppearanceSettingsGeneral />,
    },
    {
        tab: 'Theme Editor',
        panel: <ThemeEditor />,
    },
    {
        tab: 'My Themes',
        panel: <UserThemes />,
    },
];

export default function AppearanceSettings() {
    return <TabList className="appearance-settings" items={tabs} label="Appearance" />;
}
