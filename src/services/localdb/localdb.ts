import Dexie, {liveQuery} from 'dexie';
import {BehaviorSubject} from 'rxjs';
import type {Observable} from 'rxjs';
import Listen from 'types/Listen';
import PlaybackState from 'types/PlaybackState';
import {Logger} from 'utils';

console.log('module:localdb');

const logger = new Logger('localdb');

export class LocalDB extends Dexie {
    private readonly listens!: Dexie.Table<Listen, string>;
    private readonly listens$ = new BehaviorSubject<readonly Listen[]>([]);

    constructor() {
        super('ampcast/localdb');

        this.version(1).stores({
            listens: `&playedAt, src, lastfmScrobbledAt, listenbrainzScrobbledAt`,
        });

        liveQuery(() => this.listens.orderBy('playedAt').reverse().toArray()).subscribe(
            this.listens$
        );
    }

    observeListens(): Observable<readonly Listen[]> {
        return this.listens$;
    }

    async addListen(state: PlaybackState): Promise<void> {
        logger.log('addListen', {state});
        try {
            const item = state.currentItem;
            if (!item || !state.startedAt || !state.endedAt) {
                throw Error('Invalid PlaybackState.');
            }
            // These rules seem to apply for both last.fm and ListenBrainz.
            if (item.title && item.artist && item.duration > 30) {
                const startedAt = Math.floor(state.startedAt / 1000);
                const endedAt = Math.floor(state.endedAt / 1000);
                const playTime = endedAt - startedAt;
                const minTime = 4 * 60;
                if (playTime > minTime || playTime > item.duration / 2) {
                    await this.listens.add({
                        ...item,
                        playedAt: startedAt,
                        lastfmScrobbledAt: 0,
                        listenbrainzScrobbledAt: 0,
                    });
                }
            }
        } catch (err) {
            logger.error(err);
        }
    }

    async updateListens(listens: Listen[]): Promise<void> {
        logger.log('updateListens', {listens});
        try {
            await this.listens.bulkPut(listens);
        } catch (err) {
            logger.error(err);
        }
    }
}

const localdb = new LocalDB();

export default localdb;
