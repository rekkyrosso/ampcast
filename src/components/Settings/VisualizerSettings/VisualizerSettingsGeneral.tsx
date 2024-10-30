import React, {useCallback, useEffect, useId, useMemo, useRef, useState} from 'react';
import MediaType from 'types/MediaType';
import {t} from 'services/i18n';
import {isProviderSupported} from 'services/visualizer';
import visualizerSettings, {
    observeVisualizerProvider,
    VisualizerSettings,
} from 'services/visualizer/visualizerSettings';
import DialogButtons from 'components/Dialog/DialogButtons';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import useObservable from 'hooks/useObservable';
import useVisualizerProviders from 'hooks/useVisualizerProviders';
import AmbientVideoSettings from './AmbientVideoSettings';
import AmpshaderSettings from './AmpshaderSettings';
import ButterchurnSettings from './ButterchurnSettings';
import CoverArtSettings from './CoverArtSettings';
import VisualizerRandomness from './VisualizerRandomness';
import useVisualizerFavorites from './useVisualizerFavorites';

export default function VisualizerSettingsGeneral() {
    const id = useId();
    const submitted = useRef(false);
    const originalSettings = useMemo(() => ({...visualizerSettings}), []);
    const favorites = useVisualizerFavorites();
    const providers = useVisualizerProviders();
    const [provider, setProvider] = useState<string>(originalSettings.provider);
    const currentProvider = useObservable(observeVisualizerProvider, originalSettings.provider);
    const isCurrentProvider = provider === currentProvider;
    const [ambientVideoSource, setAmbientVideoSource] = useState(
        visualizerSettings.ambientVideoSource
    );
    const [useAmbientVideoSource, setUseAmbientVideoSource] = useState(
        visualizerSettings.useAmbientVideoSource
    );

    const useProvider = useCallback(() => {
        if (provider !== 'all') {
            visualizerSettings.provider = provider as VisualizerSettings['provider'];
        }
    }, [provider]);

    useEffect(() => {
        return () => {
            if (!submitted.current) {
                Object.assign(visualizerSettings, {
                    ...originalSettings,
                    // Set with `useProvider`.
                    provider: visualizerSettings.provider,
                });
            }
        };
    }, [originalSettings]);

    const handleSubmit = useCallback(() => {
        submitted.current = true;
        visualizerSettings.useAmbientVideoSource = useAmbientVideoSource;
        visualizerSettings.ambientVideoSource = ambientVideoSource;
    }, [ambientVideoSource, useAmbientVideoSource]);

    return (
        <form className="visualizer-settings-general" method="dialog" onSubmit={handleSubmit}>
            <p>
                <label htmlFor={`${id}-provider`}>Provider:</label>
                <select
                    id={`${id}-provider`}
                    defaultValue={originalSettings.provider}
                    onChange={(e) => setProvider(e.target.value)}
                >
                    <option value="all">(all)</option>
                    <option value="none">(none)</option>
                    <option value="favorites">({t('favorites')})</option>
                    <option value="random">(random)</option>
                    {providers.map((provider) => (
                        <option value={provider.id} key={provider.id}>
                            {provider.name}
                        </option>
                    ))}
                </select>
                <button
                    className={`use-provider ${isCurrentProvider ? 'in-use' : ''}`}
                    type="button"
                    disabled={isCurrentProvider || provider === 'all'}
                    onClick={useProvider}
                >
                    {isCurrentProvider ? 'current provider' : 'Use this provider'}
                </button>
            </p>
            {provider === 'all' ? (
                <AllProvidersSettings />
            ) : provider === 'random' ? (
                <VisualizerRandomness />
            ) : provider === 'ambientvideo' ? (
                <AmbientVideoSettings
                    onAmbientVideoSourceChange={setAmbientVideoSource}
                    onUseAmbientVideoSourceChange={setUseAmbientVideoSource}
                />
            ) : provider === 'ampshader' ? (
                <AmpshaderSettings />
            ) : provider === 'butterchurn' ? (
                <ButterchurnSettings />
            ) : provider === 'coverart' ? (
                <CoverArtSettings />
            ) : (
                <NoOptions />
            )}
            {provider === 'favorites' && favorites.length === 0 ? (
                <p className="compatibility">You don&apos;t have any {t('favorites')}.</p>
            ) : (
                <Compatibility provider={provider} />
            )}
            <DialogButtons />
        </form>
    );
}

function AllProvidersSettings() {
    const id = useId();
    return (
        <fieldset>
            <legend>Fullscreen</legend>
            <p>
                <input
                    type="checkbox"
                    id={`${id}-fullscreen-progress`}
                    defaultChecked={visualizerSettings.fullscreenProgress}
                    onChange={(e) => (visualizerSettings.fullscreenProgress = e.target.checked)}
                />
                <label htmlFor={`${id}-fullscreen-progress`}>Always show progress bar</label>
            </p>
        </fieldset>
    );
}

function NoOptions() {
    return (
        <fieldset>
            <legend>Options</legend>
            <p>None</p>
        </fieldset>
    );
}

function Compatibility({provider}: {provider: string}) {
    const item = useCurrentlyPlaying();

    return !item ||
        item.mediaType === MediaType.Video ||
        isProviderSupported(provider, item) ? null : (
        <p className="compatibility">Not compatible with the currently selected media.</p>
    );
}
