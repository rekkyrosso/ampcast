import React, {useCallback, useEffect, useId, useRef, useState} from 'react';
import VisualizerProviderId from 'types/VisualizerProviderId';
import {getService} from 'services/mediaServices';
import {isSourceVisible} from 'services/mediaServices/servicesSettings';
import visualizerSettings from 'services/visualizer/visualizerSettings';
import useVisualizerRandomness, {Weighting} from './useVisualizerRandomness';
import './VisualizerRandomness.scss';

export default function VisualizerRandomness() {
    const id = useId();
    const spotify = getService('spotify');
    const hasSpotify = spotify && isSourceVisible(spotify);
    const refSpotify = useRef<HTMLInputElement>(null);
    const [isSpotify, setIsSpotify] = useState(false);
    const {standardWeightings, spotifyWeightings} = useVisualizerRandomness();

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
                            defaultChecked={true}
                            onChange={handleSpotifyChange}
                        />
                        <label htmlFor={`${id}-view-standard`}>Standard</label>
                    </li>
                    <li>
                        <input
                            id={`${id}-view-spotify`}
                            name="weighting-view"
                            type="radio"
                            defaultChecked={false}
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
            <VisualizerWeightings
                weightings={spotifyWeightings}
                hidden={!isSpotify}
                onChange={handleSpotifyRandomnessChange}
            />
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
    const total = weightings.reduce((total, weighting) => total + weighting.value, 0);
    const relativeValues = weightings.map((weighting) =>
        total ? Math.round(100 * (weighting.value / total)) : 0
    );

    useEffect(() => {
        onChange(weightings);
    }, [weightings, onChange]);

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
