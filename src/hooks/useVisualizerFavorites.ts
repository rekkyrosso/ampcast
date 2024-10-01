import {map, type Observable} from 'rxjs';
import visualizerStore, {VisualizerFavorite} from 'services/visualizer/visualizerStore';
import useObservable from './useObservable';

export type KeyedVisualizerFavorite = VisualizerFavorite & {
    readonly key: string;
};

export default function useVisualizerFavorites(): readonly KeyedVisualizerFavorite[] {
    return useObservable(observeVisualizerFavorites, []);
}

function observeVisualizerFavorites(): Observable<readonly KeyedVisualizerFavorite[]> {
    return visualizerStore.observeFavorites().pipe(
        map((favorites) =>
            favorites.map((favorite) => ({
                ...favorite,
                key: `${favorite.providerId}+${favorite.name}`,
            }))
        )
    );
}
