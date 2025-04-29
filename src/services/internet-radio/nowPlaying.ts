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
import {RadioItem} from 'types/InternetRadio';
import MediaItem from 'types/MediaItem';
import NowPlaying from 'types/NowPlaying';
import {Logger} from 'utils';
import {bestOf} from 'services/metadata';
import lastfmApi from 'services/lastfm/lastfmApi';
import musicbrainzApi from 'services/musicbrainz/musicbrainzApi';
import {observePaused} from 'services/mediaPlayback/playback';
import {observeCurrentItem} from 'services/playlist';
import nowPlayingParser from './nowPlayingParser';

const logger = new Logger('internet-radio/nowPlaying');

const nothingPlaying: NowPlaying = {stationId: '', startedAt: 0, item: null};
const nowPlaying$ = new BehaviorSubject<NowPlaying>(nothingPlaying);

export function observeNowPlaying(): Observable<NowPlaying> {
    return nowPlaying$;
}

export async function getNowPlaying(item?: RadioItem): Promise<NowPlaying> {
    let nowPlaying = nowPlaying$.value;
    if (item && item.radio.id !== nowPlaying.stationId) {
        nowPlaying = await fetchNowPlayingData(item);
    }
    return nowPlaying;
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
            item = await addMetadata(item);
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

async function addMetadata<T extends MediaItem>(item: T): Promise<T> {
    const lastfmItem = await lastfmApi.addMetadata(item, {overWrite: true});
    console.log({lastfmItem});
    let foundItem: MediaItem | undefined;
    if (lastfmItem === item) {
        // Not enhanced (same item).
        const musicbrainzItem = await musicbrainzApi.addMetadata(item, {overWrite: true});
        console.log({musicbrainzItem});
        if (musicbrainzItem !== item) {
            foundItem = musicbrainzItem;
        }
    } else {
        foundItem = await musicbrainzApi.addMetadata(lastfmItem, {overWrite: false});
    }
    console.log({foundItem});
    if (foundItem) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {src, externalUrl, playedAt, ...values} = foundItem;
        const resultItem = bestOf(values as T, item);
        // Prefer `duration` provided by source.
        return {...resultItem, duration: item.duration || foundItem.duration};
    }
    return item;
}

function isRadioItem(item: MediaItem | null): item is RadioItem {
    return !!item?.radio;
}
