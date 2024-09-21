import {useEffect} from 'react';
import {isMiniPlayer} from 'utils';
import {loadMediaServices} from 'services/mediaServices';
import {loadVisualizers} from 'services/visualizer/visualizerProviders';

export default function usePreload(): void {
    useEffect(() => {
        loadMediaServices();
        if (isMiniPlayer) {
            loadVisualizers();
        }
    }, []);
}
