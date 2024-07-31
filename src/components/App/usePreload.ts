import {useEffect} from 'react';
import {isMiniPlayer} from 'utils';
import {loadServices} from 'services/mediaServices';
import {loadVisualizers} from 'services/visualizer/visualizerProviders';

export default function usePreload(): void {
    useEffect(() => {
        loadServices();
        if (isMiniPlayer) {
            loadVisualizers();
        }
    }, []);
}
