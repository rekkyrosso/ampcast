import React, {useCallback, useRef} from 'react';
import VisualizerProviderId from 'types/VisualizerProviderId';
import {getEnabledVisualizerProviders} from 'services/visualizer/visualizerProviders';
import visualizerSettings from 'services/visualizer/visualizerSettings';

export default function VisualizerSettingsGeneral() {
    const selectRef = useRef<HTMLSelectElement>(null);
    const provider = visualizerSettings.provider;

    const handleSubmit = useCallback(() => {
        visualizerSettings.provider = selectRef.current!.value as VisualizerProviderId;
    }, []);

    return (
        <form className="visualizer-settings-general" method="dialog" onSubmit={handleSubmit}>
            <p>
                <label htmlFor="visualizer-provider">Provider:</label>
                <select id="visualizer-provider" defaultValue={provider} ref={selectRef}>
                    <option value="none">(none)</option>
                    <option value="">(random)</option>
                    {getEnabledVisualizerProviders().map((provider) => (
                        <option value={provider.id} key={provider.id}>
                            {provider.name}
                        </option>
                    ))}
                </select>
            </p>
            <footer className="dialog-buttons">
                <button type="button" value="#cancel">
                    Cancel
                </button>
                <button>Confirm</button>
            </footer>
        </form>
    );
}
