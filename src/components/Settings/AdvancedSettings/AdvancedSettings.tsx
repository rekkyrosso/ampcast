import React from 'react';
import TabList, {TabItem} from 'components/TabList';
import AdvancedSettingsGeneral from './AdvancedSettingsGeneral';

const tabs: TabItem[] = [
    {
        tab: 'General',
        panel: <AdvancedSettingsGeneral />,
    },
];

export default function AdvancedSettings() {
    return <TabList className="advanced-settings" items={tabs} label="Advanced Settings" />;
}
