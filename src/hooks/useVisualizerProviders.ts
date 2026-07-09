import {useEffect} from 'react';
import {
    getVisualizerProviders,
    loadVisualizers,
    observeVisualizerProviders,
} from 'services/visualizer/visualizerProviders';
import useObservable from './useObservable';

export default function useVisualizerProviders() {
    useEffect(() => {
        loadVisualizers();
    }, []);

    return useObservable(observeVisualizerProviders, getVisualizerProviders());
}
