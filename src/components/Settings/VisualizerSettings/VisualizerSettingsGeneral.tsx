import React, {useId} from 'react';
import {t} from 'services/i18n';
import visualizerSettings from 'services/visualizer/visualizerSettings';
import DialogButtons from 'components/Dialog/DialogButtons';
import useVisualizerFavorites from 'hooks/useVisualizerFavorites';
import useVisualizerProviders from 'hooks/useVisualizerProviders';

export interface VisualizerSettingsGeneralProps {
    providerRef: React.RefObject<HTMLSelectElement>;
    ambientVideoEnabled: boolean;
    onCancel: () => void;
    onSubmit: () => void;
}

export default function VisualizerSettingsGeneral({
    providerRef,
    ambientVideoEnabled,
    onCancel,
    onSubmit,
}: VisualizerSettingsGeneralProps) {
    const id = useId();
    const favorites = useVisualizerFavorites();
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
                    <option value="favorites" disabled={favorites.length === 0}>
                        ({t('favorites')})
                    </option>
                    {providers.length > 1 ? <option value="random">(random)</option> : null}
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
                <legend>Options</legend>
                <p>
                    <input
                        type="checkbox"
                        id={`${id}-fullscreen-progress`}
                        defaultChecked={visualizerSettings.fullscreenProgress}
                        onChange={(e) => (visualizerSettings.fullscreenProgress = e.target.checked)}
                    />
                    <label htmlFor={`${id}-fullscreen-progress`}>Fullscreen progress bar</label>
                </p>
            </fieldset>
            <DialogButtons onCancelClick={onCancel} onSubmitClick={onSubmit} />
        </form>
    );
}
