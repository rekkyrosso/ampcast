import React, {useId, useMemo} from 'react';
import {getAllVisualizerProviders} from 'services/visualizer/visualizerProviders';
import visualizerSettings from 'services/visualizer/visualizerSettings';
import DialogButtons from 'components/Dialog/DialogButtons';

export interface VisualizerSettingsGeneralProps {
    providerRef: React.RefObject<HTMLSelectElement>;
    fullscreenProgressRef: React.RefObject<HTMLInputElement>;
    ambientVideoEnabled: boolean;
    onSubmit: () => void;
}

export default function VisualizerSettingsGeneral({
    providerRef,
    fullscreenProgressRef,
    ambientVideoEnabled,
    onSubmit,
}: VisualizerSettingsGeneralProps) {
    const id = useId();
    const provider = visualizerSettings.provider;
    const providers = useMemo(getAllVisualizerProviders, []);

    return (
        <form className="visualizer-settings-general" method="dialog">
            <p>
                <label htmlFor={`${id}-visualizer-provider`}>Provider:</label>
                <select id={`${id}-visualizer-provider`} defaultValue={provider} ref={providerRef}>
                    <option value="none">(none)</option>
                    {providers.length > 1 ? <option value="">(random)</option> : null}
                    {providers
                        .filter((provider) => provider.id !== 'ambientvideo' || ambientVideoEnabled)
                        .map((provider) => (
                            <option value={provider.id} key={provider.id}>
                                {provider.name}
                            </option>
                        ))}
                </select>
            </p>
            <fieldset>
                <legend>Fullscreen</legend>
                <p>
                    <input
                        type="checkbox"
                        id={`${id}-fullscreen-progress`}
                        defaultChecked={visualizerSettings.fullscreenProgress}
                        ref={fullscreenProgressRef}
                    />
                    <label htmlFor={`${id}-fullscreen-progress`}>Show progress bar</label>
                </p>
            </fieldset>
            <DialogButtons onSubmit={onSubmit} />
        </form>
    );
}
