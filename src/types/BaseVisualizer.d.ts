import Thumbnail from './Thumbnail';
import VisualizerProviderId from './VisualizerProviderId';

export default interface BaseVisualizer {
    readonly providerId: VisualizerProviderId;
    readonly name: string;
    // Everything below here should be optional.
    readonly rating?: number;
    readonly externalUrl?: string;
    readonly thumbnails?: Thumbnail[];
}
