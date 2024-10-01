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
    const providerRef = useRef<HTMLSelectElement>(null);
    const ambientVideoEnabledRef = useRef<HTMLInputElement>(null);
    const ambientVideoSourceRef = useRef<HTMLInputElement>(null);
    const useAmbientVideoSourceRef = useRef<HTMLInputElement>(null);
    const ambientVideoBeatsEnabledRef = useRef<HTMLInputElement>(null);
    const coverArtAnimatedBackgroundRef = useRef<HTMLInputElement>(null);
    const coverArtBeatsEnabledRef = useRef<HTMLInputElement>(null);
    const fullscreenProgressRef = useRef<HTMLInputElement>(null);
    const [ambientVideoEnabled, setAmbientVideoEnabled] = useState(
        visualizerSettings.ambientVideoEnabled
    );

    const handleSubmit = useCallback(() => {
        const provider = providerRef.current!.value as VisualizerProviderId;
        visualizerSettings.ambientVideoEnabled = ambientVideoEnabledRef.current!.checked;
        visualizerSettings.useAmbientVideoSource = useAmbientVideoSourceRef.current!.checked;
        visualizerSettings.ambientVideoSource = ambientVideoSourceRef.current!.value;
        visualizerSettings.ambientVideoBeats = ambientVideoBeatsEnabledRef.current!.checked;
        visualizerSettings.coverArtAnimatedBackground =
            coverArtAnimatedBackgroundRef.current!.checked;
        visualizerSettings.coverArtBeats = coverArtBeatsEnabledRef.current!.checked;
        visualizerSettings.fullscreenProgress = fullscreenProgressRef.current!.checked;
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
                        fullscreenProgressRef={fullscreenProgressRef}
                        ambientVideoEnabled={ambientVideoEnabled}
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
                        beatsOverlayEnabledRef={ambientVideoBeatsEnabledRef}
                        onAmbientVideoEnabledChange={setAmbientVideoEnabled}
                        onSubmit={handleSubmit}
                    />
                ),
            },
            {
                tab: 'Cover Art',
                panel: (
                    <CoverArtSettings
                        animatedBackgroundEnabledRef={coverArtAnimatedBackgroundRef}
                        beatsOverlayEnabledRef={coverArtBeatsEnabledRef}
                        onSubmit={handleSubmit}
                    />
                ),
            },
            {
                tab: t('Favorites'),
                panel: <VisualizerFavorites />,
            },
        ],
        [ambientVideoEnabled, handleSubmit]
    );

    return <TabList className="visualizer-settings" items={tabs} label="Visualizers" />;
}
