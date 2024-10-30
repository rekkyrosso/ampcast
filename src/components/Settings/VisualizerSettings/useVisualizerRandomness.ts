import VisualizerProviderId from 'types/VisualizerProviderId';
import {getVisualizerProvider} from 'services/visualizer/visualizerProviders';
import visualizerSettings from 'services/visualizer/visualizerSettings';

export interface Weighting {
    readonly id: VisualizerProviderId;
    readonly label: string;
    readonly value: number;
    readonly disabled: boolean;
    readonly hidden: boolean;
}

export default function useVisualizerRandomness(): {
    standardWeightings: readonly Weighting[];
    spotifyWeightings: readonly Weighting[];
} {
    return {
        standardWeightings: getWeightings(false),
        spotifyWeightings: getWeightings(true),
    };
}

function getWeightings(isSpotify: boolean): readonly Weighting[] {
    const randomness = visualizerSettings[isSpotify ? 'spotifyRandomness' : 'randomness'];
    const providerIds = Object.keys(randomness) as VisualizerProviderId[];
    return providerIds
        .map((id) => {
            const provider = getVisualizerProvider(id);
            const label = provider?.shortName || provider?.name || id;
            const value = randomness[id];
            const hidden = id === 'none';
            const disabled = isSpotify ? id === 'ambientvideo' : id === 'spotifyviz';
            return {id, label, value, disabled, hidden};
        })
        .sort((a, b) => a.id.localeCompare(b.id));
}
