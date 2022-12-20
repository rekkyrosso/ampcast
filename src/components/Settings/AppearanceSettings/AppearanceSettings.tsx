import React from 'react';
import TabList, {TabItem} from 'components/TabList';
import ThemeSettings from './ThemeSettings';

const tabs: TabItem[] = [
    {
        tab: 'Theme',
        panel: <ThemeSettings />,
    },
];

export default function AppearanceSettings() {
    return <TabList className="appearance-settings" items={tabs} label="Appearance" />;
}
