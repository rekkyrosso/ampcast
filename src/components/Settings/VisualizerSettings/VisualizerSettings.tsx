import React from 'react';
import TabList, {TabItem} from 'components/TabList';
import VisualizerGeneralSettings from './VisualizerGeneralSettings';

const tabs: TabItem[] = [
    {
        tab: 'General',
        panel: <VisualizerGeneralSettings />,
    },
];

export default function VisualizerSettings() {
    return <TabList items={tabs} label="Visualizers" />;
}
