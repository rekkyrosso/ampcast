import {useEffect, useState} from 'react';
import {defer} from 'rxjs';
import VisualizerProvider from 'types/VisualizerProvider';
import {getVisualizerProviders, loadVisualizers} from 'services/visualizer/visualizerProviders';

export default function useVisualizerProviders() {
    const [providers, setProviders] = useState<readonly VisualizerProvider[]>(() =>
        getVisualizerProviders()
    );

    useEffect(() => {
        const subscription = defer(() => loadVisualizers()).subscribe(setProviders);
        return () => subscription.unsubscribe();
    }, []);

    return providers;
}
