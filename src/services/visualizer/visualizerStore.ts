import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import Dexie, {liveQuery} from 'dexie';
import VisualizerFavorite from 'types/VisualizerFavorite';
import {Logger} from 'utils';
import youtubeApi from 'services/youtube/youtubeApi';

const logger = new Logger('visualizerStore');

class VisualizerStore extends Dexie {
    private readonly favorites!: Dexie.Table<VisualizerFavorite, [string, string]>;
    private readonly favorites$ = new BehaviorSubject<readonly VisualizerFavorite[]>([]);

    constructor() {
        super('ampcast/visualizer');

        this.version(1).stores({
            favorites: '[providerId+name]',
        });

        liveQuery(() => this.favorites.toArray()).subscribe((favorites) =>
            this.favorites$.next(favorites)
        );
    }

    observeFavorites(): Observable<readonly VisualizerFavorite[]> {
        return this.favorites$;
    }

    async addFavorite(visualizer: VisualizerFavorite): Promise<void> {
        const {providerId, name, spotifyExcluded} = visualizer;
        try {
            logger.log('addFavorite', providerId, name);
            let title = visualizer.title;
            if (providerId === 'ambientvideo' && !title) {
                try {
                    const video = await youtubeApi.getMediaItem(name);
                    title = video.title;
                } catch (err) {
                    logger.error(err);
                }
            }
            await this.favorites.put({providerId, name, title, spotifyExcluded});
        } catch (err) {
            logger.error(err);
        }
    }

    async addFavorites(visualizers: readonly VisualizerFavorite[]): Promise<void> {
        try {
            logger.log('addFavorites', visualizers.length);
            await this.favorites.bulkPut(
                visualizers.map(({providerId, name, title, spotifyExcluded}) => ({
                    providerId,
                    name,
                    title,
                    spotifyExcluded,
                }))
            );
        } catch (err) {
            logger.error(err);
        }
    }

    getFavorite(providerId: string, name: string): VisualizerFavorite | undefined {
        return this.getFavorites().find(
            (favorite) => favorite.providerId === providerId && favorite.name === name
        );
    }

    getFavorites(): readonly VisualizerFavorite[] {
        return this.favorites$.value;
    }

    hasFavorite(visualizer: VisualizerFavorite): boolean;
    hasFavorite(providerId: string, name: string): boolean;
    hasFavorite(providerId: string | VisualizerFavorite, name = ''): boolean {
        if (typeof providerId !== 'string') {
            const visualizer = providerId;
            providerId = visualizer.providerId;
            name = visualizer.name;
        }
        return !!this.favorites$.value.find(
            (favorite) => favorite.providerId === providerId && favorite.name === name
        );
    }

    hasFavorites(): boolean {
        return this.favorites$.value.length !== 0;
    }

    removeFavorite(visualizer: VisualizerFavorite): Promise<void>;
    removeFavorite(providerId: string, name: string): Promise<void>;
    async removeFavorite(providerId: string | VisualizerFavorite, name = ''): Promise<void> {
        if (typeof providerId !== 'string') {
            const visualizer = providerId;
            providerId = visualizer.providerId;
            name = visualizer.name;
        }
        try {
            logger.log('removeFavorite', providerId, name);
            await this.favorites.delete([providerId, name]);
        } catch (err) {
            logger.error(err);
        }
    }
}

const visualizerStore = new VisualizerStore();

export default visualizerStore;
