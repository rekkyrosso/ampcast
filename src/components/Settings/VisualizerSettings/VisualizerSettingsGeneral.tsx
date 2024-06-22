import React, {useId} from 'react';
import visualizerSettings from 'services/visualizer/visualizerSettings';
import DialogButtons from 'components/Dialog/DialogButtons';
import useVisualizerProviders from './useVisualizerProviders';

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
    const providers = useVisualizerProviders();

    return (
        <form className="visualizer-settings-general" method="dialog">
            <p>
                <label htmlFor={`${id}-provider`}>Provider:</label>
                <select
                    id={`${id}-provider`}
                    defaultValue={provider}
                    ref={providerRef}
                    key={providers.length} // refresh the selected option
                >
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
            <DialogButtons onSubmitClick={onSubmit} />
        </form>
    );
}
