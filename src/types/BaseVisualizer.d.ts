import VisualizerProviderId from './VisualizerProviderId';

export default interface BaseVisualizer {
    readonly providerId: VisualizerProviderId;
    readonly name: string;
    // Everything below here should be optional.
    readonly title?: string; // Readable title
    readonly externalUrl?: string;
    readonly spotifyExcluded?: boolean;
    readonly opaque?: boolean;
}
