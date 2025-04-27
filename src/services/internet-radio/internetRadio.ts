import type {Observable} from 'rxjs';
import {
    BehaviorSubject,
    distinctUntilChanged,
    map,
    merge,
    mergeMap,
    of,
    switchMap,
    tap,
    timer,
} from 'rxjs';
import {nanoid} from 'nanoid';
import Action from 'types/Action';
import InternetRadio, {RadioItem} from 'types/InternetRadio';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaServiceId from 'types/MediaServiceId';
import MediaSource from 'types/MediaSource';
import NowPlaying from 'types/NowPlaying';
import Pager from 'types/Pager';
import PlayableItem from 'types/PlayableItem';
import ServiceType from 'types/ServiceType';
import {exists, LiteStorage, Logger} from 'utils';
import {addMetadata} from 'services/metadata';
import {observePaused} from 'services/mediaPlayback/playback';
import noAuth from 'services/mediaServices/noAuth';
import {observeCurrentItem} from 'services/playlist';
import SimpleMediaPager from 'services/pagers/SimpleMediaPager';
import {t} from 'services/i18n';
import RadioBrowser from 'components/MediaBrowser/RadioBrowser';
import nowPlayingParser from './nowPlayingParser';
import stations from './stations/all';

const serviceId: MediaServiceId = 'internet-radio';
const logger = new Logger(serviceId);
const storage = new LiteStorage(serviceId);
const nothingPlaying: NowPlaying = {stationId: '', startedAt: 0, item: null};
const nowPlaying$ = new BehaviorSubject<NowPlaying>(nothingPlaying);

const internetRadioFavorites: MediaSource<MediaItem> = {
    id: `${serviceId}/favorites`,
    title: t('Favorites'),
    icon: 'heart',
    itemType: ItemType.Media,
    Component: RadioBrowser,
    search(): Pager<RadioItem> {
        return new SimpleMediaPager(async () => getFavorites());
    },
};

const internetRadio: InternetRadio = {
    ...noAuth(true),
    id: serviceId,
    name: 'Internet Radio',
    icon: serviceId,
    url: '',
    serviceType: ServiceType.PublicMedia,
    internetRequired: true,
    defaultHidden: true,
    root: {
        id: `${serviceId}/stations`,
        title: 'Stations',
        icon: serviceId,
        itemType: ItemType.Media,
        Component: RadioBrowser,
        search(): Pager<RadioItem> {
            return new SimpleMediaPager(async () => getStations());
        },
    },
    sources: [internetRadioFavorites],
    labels: {
        [Action.AddToLibrary]: t('Add to Favorites'),
        [Action.RemoveFromLibrary]: t('Remove from Favorites'),
    },
    observeNowPlaying,
    canStore,
    compareForRating,
    getNowPlaying,
    getPlayableUrl,
    getStation,
    store,
    bulkStore,
};

export default internetRadio;

function canStore<T extends MediaObject>(item: T): boolean {
    return item.src.startsWith(`${serviceId}:station:`);
}

function compareForRating<T extends MediaObject>(a: T, b: T): boolean {
    return a.src === b.src;
}

function observeNowPlaying(): Observable<NowPlaying> {
    return nowPlaying$;
}

async function getNowPlaying(item?: RadioItem): Promise<NowPlaying> {
    let nowPlaying = nowPlaying$.value;
    if (item && item.radio.id !== nowPlaying.stationId) {
        nowPlaying = await fetchNowPlayingData(item);
    }
    return nowPlaying;
}

function getPlayableUrl(item: PlayableItem): string {
    const streamUrl = stations.find((station) => station.src === item.src)?.radio?.stream;
    if (streamUrl) {
        return streamUrl;
    } else {
        throw Error('Station not found');
    }
}

async function store(item: MediaObject, inLibrary: boolean): Promise<void> {
    bulkStore([item], inLibrary);
}

async function bulkStore(items: readonly MediaObject[], inLibrary: boolean): Promise<void> {
    const favorites = new Set(getFavoriteIds());
    for (const item of items) {
        const id = (item as RadioItem).radio.id; // Let this throw
        if (inLibrary) {
            favorites.add(id);
        } else {
            favorites.delete(id);
        }
        storage.setJson<string[]>('favorites', [...favorites]);
    }
}

function getFavorites(): readonly RadioItem[] {
    return getFavoriteIds().map(getStation).filter(exists);
}

function getFavoriteIds(): readonly string[] {
    return storage.getJson<string[]>('favorites', []).reverse();
}

function getStation(id: string): RadioItem | undefined {
    const station = stations.find((station) => station.radio.id === id);
    return station ? {...station, inLibrary: isFavorite(station)} : station;
}

function getStations(): readonly RadioItem[] {
    return stations.map((station) => getStation(station.radio.id)!);
}

function isFavorite(item: RadioItem): boolean {
    return getFavoriteIds().includes(item.radio.id);
}

// Refresh `nowPlaying` state.
observePaused()
    .pipe(
        switchMap((paused) =>
            paused // InternetRadio streams can't be paused so this is the same as "stopped".
                ? of(nothingPlaying)
                : observeCurrentItem().pipe(
                      distinctUntilChanged((a, b) => a?.src === b?.src),
                      map((item) => (isRadioItem(item) ? item : null)),
                      switchMap((item) =>
                          item
                              ? merge(
                                    of({stationId: item.radio.id, startedAt: 0, item: null}),
                                    timer(500, 12_000).pipe(
                                        mergeMap(() => fetchNowPlayingData(item))
                                    )
                                )
                              : of(nothingPlaying)
                      )
                  )
        ),
        distinctUntilChanged(
            (a, b) => a?.stationId === b?.stationId && a?.item?.src === b?.item?.src
        ),
        tap(nowPlaying$)
    )
    .subscribe(logger);

async function fetchNowPlayingData(radioItem: RadioItem): Promise<NowPlaying> {
    try {
        const station = radioItem.radio;
        const response = await fetch(
            `${station.api}${station.api.includes('?') ? '&' : '?'}t=${Date.now()}`
        );
        if (!response.ok) {
            throw response;
        }
        const text = await response.text();
        let item = nowPlayingParser.parse(text, station);
        const prevPlaying = nowPlaying$.value;
        const isNewStation = prevPlaying.stationId !== station.id;
        const isNewItem = prevPlaying.item?.src !== item?.src;
        const startedAt = isNewItem ? Date.now() : prevPlaying.startedAt;
        let duration = 0;
        let endsAt = 0;
        if (item) {
            // Filter out non-music items.
            const {title, artists: [artist] = []} = item;
            if (title.includes(station.name) || artist?.includes(station.name)) {
                item = null;
            }
        }
        if (item && isNewItem) {
            duration = item.duration || 0;
            console.log('Found item:', {item});
            item = await addMetadata(item, {overWrite: true});
            console.log('Enhanced item:', {item});
            duration = duration || item.duration; // Prefer provided `duration`.
            if (!isNewStation && duration) {
                endsAt = Math.max(startedAt + duration * 1000 - 10_000, 0);
            }
        }
        return {
            stationId: station.id,
            startedAt,
            endsAt,
            // `item` is a `PlaylistItem` and requires `id`.
            item: item ? {...item, duration, id: nanoid()} : null,
        };
    } catch (err) {
        logger.error(err);
        return {stationId: radioItem.radio.id, startedAt: 0, item: null};
    }
}

function isRadioItem(item: MediaItem | null): item is RadioItem {
    return !!item?.radio;
}
