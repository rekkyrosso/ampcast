import Thumbnail from './Thumbnail';
import VisualizerProviderId from './VisualizerProviderId';

export default interface BaseVisualizer<T extends VisualizerProviderId> {
    readonly providerId: T;
    readonly name: string;
    readonly rating?: number;
    readonly externalUrl?: string;
    readonly thumbnails?: Thumbnail[];
}
