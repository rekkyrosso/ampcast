import type {Observable} from 'rxjs';
import {map, of, switchMap} from 'rxjs';
import {observeVisualizerProvider} from 'services/visualizer';
import {observeVisualizersByProviderId} from 'services/visualizer/visualizerProviders';
import visualizerStore from 'services/visualizer/visualizerStore';
import useObservable from 'hooks/useObservable';

export default function useCanLockVisualizer(): boolean {
    return useObservable(observeCanLockVisualizer, false);
}

function observeCanLockVisualizer(): Observable<boolean> {
    return observeVisualizerProvider().pipe(
        switchMap((provider) => {
            switch (provider) {
                case 'none':
                    return of(false);

                case 'random':
                    return of(true);

                case 'favorites':
                    return visualizerStore
                        .observeFavorites()
                        .pipe(map((favorites) => favorites.length > 1));

                default:
                    return observeVisualizersByProviderId(provider).pipe(
                        map((visualizers) => visualizers.length > 1)
                    );
            }
        })
    );
}
