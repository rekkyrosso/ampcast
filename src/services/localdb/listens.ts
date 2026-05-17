import type {Observable} from 'rxjs';
import {BehaviorSubject, filter, fromEvent, map, merge} from 'rxjs';
import Dexie, {liveQuery} from 'dexie';
import LinearType from 'types/LinearType';
import Listen from 'types/Listen';
import MediaItem from 'types/MediaItem';
import PlaybackState from 'types/PlaybackState';
import {ScrobblerId} from 'types/MediaServiceId';
import {Logger, fuzzyCompare} from 'utils';
import {findBestMatch, removeUserData} from 'services/metadata';
import musicbrainzApi from 'services/musicbrainz/musicbrainzApi';
import {observeScrobbleSettingsChange} from 'services/scrobbleSettings';
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

export function observeUnscrobbled(scrobblerId: ScrobblerId): Observable<readonly Listen[]> {
    return merge(observeListens(), observeScrobbleSettingsChange()).pipe(
        map(() => getListens().filter((item) => item[`${scrobblerId}ScrobbledAt`] === 0))
    );
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
        if (isListenedTo(item.duration, state.startedAt, state.endedAt)) {
            logger.log('add', item.src);
            if (!item.linearType || item.linearType === LinearType.MusicTrack) {
                item = await musicbrainzApi.addMetadata(item, {strictMatch: true});
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const {id, blob, blobUrl, unplayable, ...listen} = removeUserData(item);
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

export async function addListens(listens: readonly Listen[]): Promise<void> {
    try {
        // Dexie throws lots of errors if *all* of the additions are duplicates.
        // So manually filter instead.
        const existingKeys = new Set(getListens().map((listen) => listen.playedAt));
        listens = listens.filter((listen) => !existingKeys.has(listen.playedAt));
        if (listens.length > 0) {
            await store.items.bulkAdd(listens);
        }
    } catch (err: any) {
        logger.error(err);
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

export function getListens(): readonly Listen[] {
    return listens$.value;
}

export function isListen(item: MediaItem): item is Listen {
    return 'lastfmScrobbledAt' in item;
}

export function isRecentListen(item: MediaItem): boolean {
    const twoWeeks = 2 * 7 * 24 * 60 * 60;
    const twoWeeksAgo = Math.floor(Date.now() / 1000) - twoWeeks;
    return isListen(item) && item.endedAt > twoWeeksAgo;
}

export async function updateListens(
    updates: readonly (Pick<Listen, 'playedAt'> & Partial<Listen>)[]
): Promise<void> {
    try {
        if (updates.length > 0) {
            await store.transaction('rw', store.items, async () => {
                const keys = updates.map((update) => update.playedAt);
                await store.items
                    .where('playedAt')
                    .anyOf(keys)
                    .modify((listen, ref) => {
                        ref.value = {
                            ...listen,
                            ...updates.find((update) => update.playedAt === listen.playedAt),
                        };
                    });
            });
        }
    } catch (err) {
        logger.error(err);
    }
}

function matchTitle(item: MediaItem, listen: MediaItem, tolerance?: number): boolean {
    return fuzzyCompare(item.title, listen.title, tolerance);
}

async function markExpired(scrobblerId: ScrobblerId): Promise<void> {
    const scrobbledAt = `${scrobblerId}ScrobbledAt`;
    const unscrobbled = await store.items.where(scrobbledAt).equals(0).toArray();
    const expired = unscrobbled
        .filter((listen) => !isRecentListen(listen))
        .map((listen) => ({...listen, [scrobbledAt]: -1}));
    try {
        if (expired.length > 0) {
            await store.items.bulkPut(expired);
        }
    } catch (err) {
        logger.error(err);
    }
}
