import visualizerSettings, {
    observeVisualizerSettings,
} from 'services/visualizer/visualizerSettings';
import useObservable from './useObservable';

export default function useVisualizerSettings() {
    return useObservable(observeVisualizerSettings, {...visualizerSettings});
}
