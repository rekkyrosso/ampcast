import type {Observable} from 'rxjs';
import {BehaviorSubject, filter, fromEvent} from 'rxjs';
import Dexie, {liveQuery} from 'dexie';
import LinearType from 'types/LinearType';
import Listen from 'types/Listen';
import MediaItem from 'types/MediaItem';
import PlaybackState from 'types/PlaybackState';
import PlaylistItem from 'types/PlaylistItem';
import {Logger, fuzzyCompare} from 'utils';
import {findBestMatch, removeUserData} from 'services/metadata';
import musicbrainzApi from 'services/musicbrainz/musicbrainzApi';
import session from 'services/session';

const logger = new Logger('localdb/listens');

const UNINITIALIZED: Listen[] = [];
const listens$ = new BehaviorSubject<readonly Listen[]>(UNINITIALIZED);

class ListensStore extends Dexie {
    readonly items!: Dexie.Table<Listen, number>;

    constructor() {
        super('ampcast/listens');

        this.version(2)
            .stores({
                items: '&playedAt, src, lastfmScrobbledAt, listenbrainzScrobbledAt',
            })
            .upgrade((tx) => {
                return tx
                    .table('items')
                    .toCollection()
                    .modify((listen) => {
                        delete listen.blobUrl;
                        delete listen.unplayable;
                    });
            });

        const subscription = liveQuery(() =>
            this.items.orderBy('playedAt').reverse().toArray()
        ).subscribe(listens$);

        fromEvent(window, 'pagehide').subscribe(() => subscription.unsubscribe());

        setTimeout(() => {
            try {
                Promise.all([markExpired('lastfm'), markExpired('listenbrainz')]);
            } catch (err) {
                logger.error(err);
            }
        }, 3_000);
    }
}

const store = new ListensStore();

export default store;

export function observeListens(): Observable<readonly Listen[]> {
    return listens$.pipe(filter((items) => items !== UNINITIALIZED));
}

function isListen(item: PlaylistItem): boolean {
    switch (item.linearType) {
        case undefined:
        case LinearType.OnDemand:
        case LinearType.Station:
        case LinearType.MusicTrack:
            return true;

        default:
            return false;
    }
}

export function isListenedTo(duration: number, startedAt: number, endedAt: number): boolean {
    const minPlayTime = Math.min(duration / 2, 4 * 60) || 60;
    startedAt = Math.floor(startedAt / 1000);
    endedAt = Math.floor(endedAt / 1000);
    const playTime = endedAt - startedAt;
    return playTime > minPlayTime;
}

export async function addListen(state: PlaybackState): Promise<void> {
    try {
        let item = state.currentItem;
        if (!item || !state.startedAt || !state.endedAt) {
            throw Error('Invalid playback state');
        }
        if (isListen(item) && isListenedTo(item.duration, state.startedAt, state.endedAt)) {
            item = await musicbrainzApi.addMetadata(item, {strictMatch: true});
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const {id, blob, blobUrl, unplayable, ...listen} = removeUserData(item);
            logger.log('add', item.src);
            await store.items.add({
                ...listen,
                sessionId: session.id,
                playedAt: Math.floor(state.startedAt / 1000),
                endedAt: Math.floor(state.endedAt / 1000),
                lastfmScrobbledAt: 0,
                listenbrainzScrobbledAt: 0,
            });
        }
    } catch (err) {
        logger.error(err);
    }
}

export async function updateListens(items: readonly Listen[]): Promise<void> {
    try {
        if (items.length > 0) {
            await store.items.bulkPut(items);
        }
    } catch (err) {
        logger.error(err);
    }
}

export function findScrobble(
    scrobbles: readonly MediaItem[],
    listen: Listen,
    timeFuzziness = 5
): MediaItem | undefined {
    const startTime = listen.playedAt - timeFuzziness;
    const endTime = (listen.endedAt || listen.playedAt + listen.duration) + timeFuzziness;
    for (const scrobble of scrobbles) {
        const scrobbledAt = scrobble.playedAt;
        if (scrobbledAt >= startTime && scrobbledAt <= endTime) {
            if (matchTitle(listen, scrobble, 0.5)) {
                return scrobble;
            }
        }
    }
}

export function findListen(item: MediaItem): MediaItem | undefined {
    // This is slow if you have a lot of listens.
    return findListenByPlayedAt(item) || findBestMatch(getListens(), item);
}

export function findListenByPlayedAt(item: MediaItem, timeFuzziness = 5): Listen | undefined {
    const playedAt = item.playedAt;
    if (!playedAt) {
        return undefined;
    }
    const listens = getListens();
    for (let i = 0; i < listens.length; i++) {
        const prevListen = listens[i - 1];
        if (prevListen && prevListen.playedAt < playedAt) {
            return undefined;
        }
        const listen = listens[i];
        const startTime = listen.playedAt - timeFuzziness;
        const endTime = listen.playedAt + listen.duration + timeFuzziness;
        if (playedAt > startTime && playedAt < endTime) {
            if (matchTitle(listen, item, 0.75)) {
                return listen;
            }
        }
    }
}

export function getListens(): readonly Listen[] {
    return listens$.value;
}

function matchTitle(item: MediaItem, listen: MediaItem, tolerance?: number): boolean {
    return fuzzyCompare(item.title, listen.title, tolerance);
}

async function markExpired(serviceName: string): Promise<void> {
    const scrobbledAt = `${serviceName}ScrobbledAt`;
    const twoWeeks = 2 * 7 * 24 * 60 * 60;
    const twoWeeksAgo = Math.floor(Date.now() / 1000) - twoWeeks;
    const unscrobbled = await store.items.where(scrobbledAt).equals(0).toArray();
    await updateListens(
        unscrobbled
            .filter((item) => item.playedAt < twoWeeksAgo)
            .map((item) => ({...item, [scrobbledAt]: -1}))
    );
}
