import VisualizerProvider from './VisualizerProvider';

export default interface Visualizer {
    readonly provider: VisualizerProvider;
    readonly preset: string;
}
