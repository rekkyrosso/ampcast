import Thumbnail from './Thumbnail';
import VisualizerProvider from './VisualizerProvider';

export default interface BaseVisualizer<T extends VisualizerProvider> {
    readonly provider: T;
    readonly name: string;
    readonly rating?: number;
    readonly externalUrl?: string;
    readonly thumbnails?: Thumbnail[];
}
