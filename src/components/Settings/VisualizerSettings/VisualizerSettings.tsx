import React from 'react';
import TabList, {TabItem} from 'components/TabList';
import VisualizerSettingsGeneral from './VisualizerSettingsGeneral';
import AmbientVideoSettings from './AmbientVideoSettings';
import './VisualizerSettings.scss';

const tabs: TabItem[] = [
    {
        tab: 'General',
        panel: <VisualizerSettingsGeneral />,
    },
    {
        tab: 'Ambient Video',
        panel: <AmbientVideoSettings />,
    },
];

export default function VisualizerSettings() {
    return <TabList className="visualizer-settings" items={tabs} label="Visualizers" />;
}
