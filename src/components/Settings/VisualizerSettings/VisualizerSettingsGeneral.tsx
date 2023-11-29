import React, {useId, useMemo} from 'react';
import {getAllVisualizerProviders} from 'services/visualizer/visualizerProviders';
import visualizerSettings from 'services/visualizer/visualizerSettings';
import DialogButtons from 'components/Dialog/DialogButtons';

export interface VisualizerSettingsGeneralProps {
    providerRef: React.RefObject<HTMLSelectElement>;
    ambientVideoEnabled: boolean;
    onSubmit: () => void;
}

export default function VisualizerSettingsGeneral({
    providerRef,
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
            <DialogButtons onSubmit={onSubmit} />
        </form>
    );
}
