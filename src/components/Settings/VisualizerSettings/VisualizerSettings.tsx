import React, {useCallback, useMemo, useRef, useState} from 'react';
import VisualizerProviderId from 'types/VisualizerProviderId';
import {t} from 'services/i18n';
import visualizerSettings from 'services/visualizer/visualizerSettings';
import TabList, {TabItem} from 'components/TabList';
import VisualizerSettingsGeneral from './VisualizerSettingsGeneral';
import AmbientVideoSettings from './AmbientVideoSettings';
import CoverArtSettings from './CoverArtSettings';
import VisualizerFavorites from './VisualizerFavorites';
import './VisualizerSettings.scss';

export default function VisualizerSettings() {
    const originalSettings = useMemo(() => ({...visualizerSettings}), []);
    const providerRef = useRef<HTMLSelectElement>(null);
    const ambientVideoEnabledRef = useRef<HTMLInputElement>(null);
    const ambientVideoSourceRef = useRef<HTMLInputElement>(null);
    const useAmbientVideoSourceRef = useRef<HTMLInputElement>(null);
    const [ambientVideoEnabled, setAmbientVideoEnabled] = useState(
        visualizerSettings.ambientVideoEnabled
    );

    const handleCancel = useCallback(() => {
        Object.assign(visualizerSettings, originalSettings);
    }, [originalSettings]);

    const handleSubmit = useCallback(() => {
        const provider = providerRef.current!.value as VisualizerProviderId;
        visualizerSettings.ambientVideoEnabled = ambientVideoEnabledRef.current!.checked;
        visualizerSettings.useAmbientVideoSource = useAmbientVideoSourceRef.current!.checked;
        visualizerSettings.ambientVideoSource = ambientVideoSourceRef.current!.value;
        if (visualizerSettings.provider !== provider) {
            visualizerSettings.lockedVisualizer = null;
            visualizerSettings.provider = provider;
        }
    }, []);

    const tabs: TabItem[] = useMemo(
        () => [
            {
                tab: 'General',
                panel: (
                    <VisualizerSettingsGeneral
                        providerRef={providerRef}
                        ambientVideoEnabled={ambientVideoEnabled}
                        onCancel={handleCancel}
                        onSubmit={handleSubmit}
                    />
                ),
            },
            {
                tab: 'Ambient Video',
                panel: (
                    <AmbientVideoSettings
                        ambientVideoEnabledRef={ambientVideoEnabledRef}
                        ambientVideoSourceRef={ambientVideoSourceRef}
                        useAmbientVideoSourceRef={useAmbientVideoSourceRef}
                        onAmbientVideoEnabledChange={setAmbientVideoEnabled}
                        onCancel={handleCancel}
                        onSubmit={handleSubmit}
                    />
                ),
            },
            {
                tab: 'Cover Art',
                panel: <CoverArtSettings onCancel={handleCancel} onSubmit={handleSubmit} />,
            },
            {
                tab: t('Favorites'),
                panel: <VisualizerFavorites onCancel={handleCancel} onSubmit={handleSubmit} />,
            },
        ],
        [ambientVideoEnabled, handleCancel, handleSubmit]
    );

    return <TabList className="visualizer-settings" items={tabs} label="Visualizers" />;
}
