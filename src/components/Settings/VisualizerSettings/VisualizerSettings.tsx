import React, {useCallback, useMemo, useRef, useState} from 'react';
import VisualizerProviderId from 'types/VisualizerProviderId';
import visualizerSettings from 'services/visualizer/visualizerSettings';
import TabList, {TabItem} from 'components/TabList';
import VisualizerSettingsGeneral from './VisualizerSettingsGeneral';
import AmbientVideoSettings from './AmbientVideoSettings';
import './VisualizerSettings.scss';

export default function VisualizerSettings() {
    const providerRef = useRef<HTMLSelectElement>(null);
    const ambientVideoEnabledRef = useRef<HTMLInputElement>(null);
    const ambientVideoSourceRef = useRef<HTMLInputElement>(null);
    const useAmbientVideoSourceRef = useRef<HTMLInputElement>(null);
    const beatsOverlayEnabledRef = useRef<HTMLInputElement>(null);
    const [ambientVideoEnabled, setAmbientVideoEnabled] = useState(
        visualizerSettings.ambientVideoEnabled
    );

    const handleSubmit = useCallback(() => {
        visualizerSettings.provider = providerRef.current!.value as VisualizerProviderId;
        visualizerSettings.ambientVideoEnabled = ambientVideoEnabledRef.current!.checked;
        visualizerSettings.useAmbientVideoSource = useAmbientVideoSourceRef.current!.checked;
        visualizerSettings.ambientVideoSource = ambientVideoSourceRef.current!.value;
        visualizerSettings.beatsOverlay = beatsOverlayEnabledRef.current!.checked;
    }, []);

    const tabs: TabItem[] = useMemo(
        () => [
            {
                tab: 'General',
                panel: (
                    <VisualizerSettingsGeneral
                        providerRef={providerRef}
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
                        beatsOverlayEnabledRef={beatsOverlayEnabledRef}
                        onAmbientVideoEnabledChange={setAmbientVideoEnabled}
                        onSubmit={handleSubmit}
                    />
                ),
            },
        ],
        [ambientVideoEnabled, handleSubmit]
    );

    return <TabList className="visualizer-settings" items={tabs} label="Visualizers" />;
}
