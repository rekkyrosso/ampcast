import type {Observable} from 'rxjs';
import {BehaviorSubject, filter} from 'rxjs';
import Dexie, {liveQuery} from 'dexie';
import Listen from 'types/Listen';
import MediaItem from 'types/MediaItem';
import PlaybackState from 'types/PlaybackState';
import {findBestMatch, fuzzyCompare} from 'services/lookup';
import {addMetadata} from 'services/musicbrainz/musicbrainzApi';
import session from 'services/session';
import {Logger} from 'utils';

const logger = new Logger('localdb/listens');

const UNINITIALIZED: Listen[] = [];
const listens$ = new BehaviorSubject<readonly Listen[]>(UNINITIALIZED);

class ListensStore extends Dexie {
    readonly items!: Dexie.Table<Listen, number>;

    constructor() {
        super('ampcast/listens');

        this.version(1).stores({
            items: `&playedAt, src, lastfmScrobbledAt, listenbrainzScrobbledAt`,
        });
    }
}

const store = new ListensStore();

export function observeListens(): Observable<readonly Listen[]> {
    return listens$.pipe(filter((items) => items !== UNINITIALIZED));
}

export function isListenedTo(duration: number, startedAt: number, endedAt: number): boolean {
    const minPlayTime = Math.min(duration / 2, 4 * 60);
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
            try {
                item = await addMetadata(item, true);
            } catch (err) {
                logger.warn(err);
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const {id, lookupStatus, blob, ...listen} = item;
            logger.log('add', item.src);
            await store.items.add({
                ...listen,
                sessionId: session.id,
                playedAt: Math.floor(state.startedAt / 1000),
                lastfmScrobbledAt: 0,
                listenbrainzScrobbledAt: 0,
            });
        }
    } catch (err) {
        logger.error(err);
    }
}

export async function updateListens(items: Listen[]): Promise<void> {
    try {
        if (items.length > 0) {
            await store.items.bulkPut(items);
        }
    } catch (err) {
        logger.error(err);
    }
}

export function getListenId(item: MediaItem, timeFuzziness = 30): number {
    return Math.round(item.playedAt / timeFuzziness);
}

export function findScrobble(
    scrobbles: readonly MediaItem[],
    listen: Listen,
    timeFuzziness = 5
): MediaItem | undefined {
    const playedAt = listen.playedAt;
    const startTime = playedAt - timeFuzziness;
    const endTime = playedAt + listen.duration + timeFuzziness;
    for (const item of scrobbles) {
        if (item.playedAt < startTime) {
            return undefined;
        }
        if (item.playedAt > startTime && item.playedAt < endTime) {
            if (matchTitle(listen, item, 0.5)) {
                return item;
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
    return listens$.getValue();
}

function matchTitle(item: MediaItem, listen: MediaItem, tolerance?: number): boolean {
    return fuzzyCompare(item.title, listen.title, tolerance);
}

(async () => {
    try {
        await markExpired('lastfm');
        await markExpired('listenbrainz');
    } catch (err) {
        logger.error(err);
    }

    liveQuery(() => store.items.orderBy('playedAt').reverse().toArray()).subscribe(listens$);
})();

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
