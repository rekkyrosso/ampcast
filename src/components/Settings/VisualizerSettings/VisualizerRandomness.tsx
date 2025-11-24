import React, {useCallback, useEffect, useId, useMemo, useRef, useState} from 'react';
import VisualizerProviderId from 'types/VisualizerProviderId';
import {browser} from 'utils';
import {downloadUrl} from 'services/constants';
import {audioSettings} from 'services/audio';
import {getService} from 'services/mediaServices';
import {getCurrentItem} from 'services/playlist';
import {isSourceVisible} from 'services/mediaServices/servicesSettings';
import visualizerSettings from 'services/visualizer/visualizerSettings';
import {confirm} from 'components/Dialog';
import ExternalLink from 'components/ExternalLink';
import useAudioSettings from 'hooks/useAudioSettings';
import usePrevious from 'hooks/usePrevious';
import useVisualizerRandomness, {Weighting} from './useVisualizerRandomness';
import './VisualizerRandomness.scss';

export default function VisualizerRandomness() {
    const id = useId();
    const spotify = getService('spotify');
    const hasSpotify = spotify && isSourceVisible(spotify);
    const refSpotify = useRef<HTMLInputElement>(null);
    const isSpotifyItem = useMemo(() => getCurrentItem()?.src.startsWith('spotify:'), []);
    const [isSpotify, setIsSpotify] = useState(isSpotifyItem);
    const {standardWeightings, spotifyWeightings} = useVisualizerRandomness();
    const {useSystemAudio} = useAudioSettings();

    const handleRandomnessChange = useCallback((weightings: readonly Weighting[]) => {
        const randomness: Record<string, number> = {};
        for (const weighting of weightings) {
            randomness[weighting.id] = weighting.value;
        }
        visualizerSettings.randomness = randomness as Record<VisualizerProviderId, number>;
    }, []);

    const handleSpotifyRandomnessChange = useCallback((weightings: readonly Weighting[]) => {
        const randomness: Record<string, number> = {};
        for (const weighting of weightings) {
            randomness[weighting.id] = weighting.value;
        }
        visualizerSettings.spotifyRandomness = randomness as Record<VisualizerProviderId, number>;
    }, []);

    const handleSpotifyChange = useCallback(() => {
        setIsSpotify(refSpotify.current!.checked);
    }, []);

    const enableSystemAudio = useCallback(async () => {
        const confirmed = await confirm({
            icon: 'settings',
            message: 'Enable system audio?',
            okLabel: 'Enable',
            system: true,
        });
        if (confirmed) {
            audioSettings.useSystemAudio = true;
        }
    }, []);

    return (
        <fieldset className="visualizer-randomness">
            <legend>Randomness</legend>
            {hasSpotify ? (
                <ul className="view-selector">
                    <li>
                        <input
                            id={`${id}-view-standard`}
                            name="weighting-view"
                            type="radio"
                            defaultChecked={!isSpotifyItem}
                            onChange={handleSpotifyChange}
                        />
                        <label htmlFor={`${id}-view-standard`}>Standard</label>
                    </li>
                    <li>
                        <input
                            id={`${id}-view-spotify`}
                            name="weighting-view"
                            type="radio"
                            defaultChecked={isSpotifyItem}
                            onChange={handleSpotifyChange}
                            ref={refSpotify}
                        />
                        <label htmlFor={`${id}-view-spotify`}>Spotify</label>
                    </li>
                </ul>
            ) : null}
            <VisualizerWeightings
                weightings={standardWeightings}
                hidden={isSpotify}
                onChange={handleRandomnessChange}
            />
            {visualizerSettings.spotifyAnalyserEnabled || useSystemAudio ? (
                <VisualizerWeightings
                    weightings={spotifyWeightings}
                    hidden={!isSpotify}
                    onChange={handleSpotifyRandomnessChange}
                />
            ) : (
                <div className="weightings note" hidden={!isSpotify}>
                    {browser.isElectron ? (
                        <p>
                            You need to{' '}
                            <span className="enable-system-audio" onClick={enableSystemAudio}>
                                enable system audio
                            </span>{' '}
                            for Spotify visualizers to work.
                        </p>
                    ) : (
                        <p>
                            Spotify visualizers are only supported on{' '}
                            <ExternalLink href="https://ampcast.app">ampcast.app</ExternalLink> or
                            the <ExternalLink href={downloadUrl}>desktop app</ExternalLink>.
                        </p>
                    )}
                </div>
            )}
        </fieldset>
    );
}

interface VisualizerWeightingsProps {
    hidden?: boolean;
    weightings: readonly Weighting[];
    onChange: (weightings: readonly Weighting[]) => void;
}

function VisualizerWeightings({
    weightings: originalWeightings,
    hidden,
    onChange,
}: VisualizerWeightingsProps) {
    const id = useId();
    const [weightings, setWeightings] = useState(originalWeightings);
    const prevWeightings = usePrevious(weightings);
    const total = weightings.reduce((total, weighting) => total + weighting.value, 0);
    const relativeValues = weightings.map((weighting) =>
        total ? Math.round(100 * (weighting.value / total)) : 0
    );

    useEffect(() => {
        if (prevWeightings && weightings !== prevWeightings) {
            onChange(weightings);
        }
    }, [weightings, prevWeightings, onChange]);

    return (
        <div className="weightings table-layout" hidden={hidden}>
            {weightings.map((weighting, index) => (
                <p
                    className={`${weighting.disabled ? 'disabled' : ''} ${
                        weighting.value === 0 ? 'is-zero' : ''
                    }`}
                    hidden={weighting.hidden}
                    key={weighting.id}
                >
                    <label htmlFor={`${id}-${weighting.id}`}>{weighting.label}:</label>
                    <input
                        id={`${id}-${weighting.id}`}
                        name={weighting.id}
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        defaultValue={weighting.value}
                        disabled={weighting.disabled}
                        onChange={(e) =>
                            setWeightings?.((weightings) =>
                                weightings.map((weighting) =>
                                    weighting.id === e.target.name
                                        ? {...weighting, value: e.target.valueAsNumber}
                                        : weighting
                                )
                            )
                        }
                    />
                    <span className="relative-weight">{relativeValues[index]}%</span>
                </p>
            ))}
        </div>
    );
}
