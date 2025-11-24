import VisualizerProviderId from './VisualizerProviderId';
import Visualizer from './Visualizer';

export type Randomness = Readonly<Record<VisualizerProviderId, number>>;

export default interface VisualizerSettings {
    provider: VisualizerProviderId | 'favorites' | 'random';
    fallbackProvider: Extract<VisualizerProviderId, 'none' | 'coverart'>;
    ambientVideoBeats: boolean;
    ambientVideoSource: string;
    useAmbientVideoSource: boolean;
    ampshaderTransparency: boolean;
    butterchurnTransitionDelay: number;
    butterchurnTransitionDuration: number;
    butterchurnTransparency: boolean;
    coverArtAnimatedBackground: boolean;
    coverArtBeats: boolean;
    fullscreenProgress: boolean;
    lockedVisualizer: Pick<Visualizer, 'providerId' | 'name'> | null;
    randomness: Randomness;
    spotifyRandomness: Randomness;
    spotifyAnalyserEnabled: boolean;
}
