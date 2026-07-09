import React, {useCallback, useEffect, useId, useMemo, useRef, useState} from 'react';
import MediaType from 'types/MediaType';
import VisualizerSettings from 'types/VisualizerSettings';
import {VisualizerSettingsComponentHandle} from 'types/VisualizerComponents';
import {t} from 'services/i18n';
import {isProviderSupported, observeVisualizerProvider} from 'services/visualizer';
import visualizerSettings from 'services/visualizer/visualizerSettings';
import Button from 'components/Button';
import {DialogButtons} from 'components/Dialog';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import useObservable from 'hooks/useObservable';
import useVisualizerProviders from 'hooks/useVisualizerProviders';
import VisualizerRandomness from './VisualizerRandomness';
import useVisualizerFavorites from './useVisualizerFavorites';

export default function VisualizerSettingsGeneral() {
    const id = useId();
    const componentRef = useRef<VisualizerSettingsComponentHandle>(null);
    const submitted = useRef(false);
    const originalSettings = useMemo(() => ({...visualizerSettings}), []);
    const favorites = useVisualizerFavorites();
    const providers = useVisualizerProviders();
    const [providerId, setProviderId] = useState<string>(originalSettings.provider);
    const currentProvider = useObservable(observeVisualizerProvider, originalSettings.provider);
    const isCurrentProvider = providerId === currentProvider;
    const selectedProvider = providers.find((provider) => provider.id === providerId);
    const Component = selectedProvider?.Components?.Settings;

    const useProvider = useCallback(() => {
        if (providerId !== 'all') {
            visualizerSettings.provider = providerId as VisualizerSettings['provider'];
        }
    }, [providerId]);

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
        componentRef.current?.submit?.();
    }, []);

    return (
        <form className="visualizer-settings-general" method="dialog" onSubmit={handleSubmit}>
            <p>
                <label htmlFor={`${id}-provider`}>Provider:</label>
                <select
                    id={`${id}-provider`}
                    defaultValue={originalSettings.provider}
                    onChange={(e) => setProviderId(e.target.value)}
                    key={providers.length}
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
                <Button
                    className={`use-provider ${isCurrentProvider ? 'in-use' : ''}`}
                    type="button"
                    disabled={isCurrentProvider || providerId === 'all'}
                    onClick={useProvider}
                >
                    {isCurrentProvider ? 'current provider' : 'Use this provider'}
                </Button>
            </p>
            {Component ? (
                <Component ref={componentRef} />
            ) : providerId === 'all' ? (
                <AllProvidersSettings />
            ) : providerId === 'random' ? (
                <VisualizerRandomness />
            ) : (
                <NoOptions />
            )}
            {providerId === 'favorites' && favorites.length === 0 ? (
                <p className="compatibility">You don&apos;t have any {t('favorites')}.</p>
            ) : ['all', 'none', 'favorites', 'random', 'coverart'].includes(providerId) ? null : (
                <Compatibility provider={providerId} />
            )}
            <DialogButtons />
        </form>
    );
}

function AllProvidersSettings() {
    const id = useId();
    const originalSettings = useMemo(() => ({...visualizerSettings}), []);
    return (
        <>
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
            <fieldset>
                <legend>Fallback</legend>
                <p>
                    <label htmlFor={`${id}-fallback-provider`}>Fallback provider:</label>
                    <select
                        id={`${id}-fallback-provider`}
                        defaultValue={originalSettings.fallbackProvider}
                        onChange={(e) =>
                            (visualizerSettings.fallbackProvider = e.target.value as any)
                        }
                    >
                        <option value="none">(none)</option>
                        <option value="coverart">Cover Art</option>
                    </select>
                </p>
            </fieldset>
        </>
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
