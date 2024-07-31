import {useEffect, useState} from 'react';
import {from} from 'rxjs';
import VisualizerProvider from 'types/VisualizerProvider';
import {loadVisualizers} from 'services/visualizer/visualizerProviders';

export default function useVisualizerProviders() {
    const [providers, setProviders] = useState<readonly VisualizerProvider[]>([]);

    useEffect(() => {
        const subscription = from(loadVisualizers()).subscribe(setProviders);
        return () => subscription.unsubscribe();
    }, []);

    return providers;
}
