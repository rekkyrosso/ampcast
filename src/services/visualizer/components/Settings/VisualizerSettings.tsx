import React, {useMemo} from 'react';
import {t} from 'services/i18n';
import TabList, {TabItem} from 'components/TabList';
import VisualizerSettingsGeneral from './VisualizerSettingsGeneral';
import VisualizerFavorites from './VisualizerFavorites';
import './VisualizerSettings.scss';

export default function VisualizerSettings() {
    const tabs: TabItem[] = useMemo(
        () => [
            {
                tab: 'General',
                panel: <VisualizerSettingsGeneral />,
            },
            {
                tab: t('Favorites'),
                panel: <VisualizerFavorites />,
            },
        ],
        []
    );

    return <TabList className="visualizer-settings" items={tabs} label="Visualizers" />;
}
