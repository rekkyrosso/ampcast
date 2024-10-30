import type {Observable} from 'rxjs';
import {combineLatest, map} from 'rxjs';
import PlaylistItem from 'types/PlaylistItem';
import {getCurrentItem, observeCurrentItem} from 'services/playlist';
import {isVisualizerLoaded, isVisualizerSupported} from 'services/visualizer';
import visualizerStore, {VisualizerFavorite} from 'services/visualizer/visualizerStore';
import useObservable from 'hooks/useObservable';

export type KeyedVisualizerFavorite = VisualizerFavorite & {
    readonly key: string;
    readonly status: string;
};

export default function useVisualizerFavorites(): readonly KeyedVisualizerFavorite[] {
    return useObservable(observeVisualizerFavorites, getVisualizerFavorites());
}

function observeVisualizerFavorites(): Observable<readonly KeyedVisualizerFavorite[]> {
    return combineLatest([visualizerStore.observeFavorites(), observeCurrentItem()]).pipe(
        map(([favorites, item]) => createVisualizerFavorites(favorites, item))
    );
}

function getVisualizerFavorites(): readonly KeyedVisualizerFavorite[] {
    const favorites = visualizerStore.getFavorites();
    const item = getCurrentItem();
    return createVisualizerFavorites(favorites, item);
}

function createVisualizerFavorites(
    favorites: readonly VisualizerFavorite[],
    item: PlaylistItem | null
): readonly KeyedVisualizerFavorite[] {
    return favorites.map((favorite) => ({
        ...favorite,
        key: `${favorite.providerId}+${favorite.name}`,
        status: getStatus(favorite, item),
    }));
}

function getStatus(favorite: VisualizerFavorite, item: PlaylistItem | null): string {
    if (isVisualizerLoaded(favorite)) {
        if (!item || isVisualizerSupported(favorite, item)) {
            return '';
        } else {
            return 'not supported for current media';
        }
    } else {
        return 'not loaded';
    }
}
