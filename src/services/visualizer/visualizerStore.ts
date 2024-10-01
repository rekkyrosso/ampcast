import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import Dexie, {liveQuery} from 'dexie';
import Visualizer from 'types/Visualizer';
import VisualizerProviderId from 'types/VisualizerProviderId';
import {Logger} from 'utils';

const logger = new Logger('visualizerStore');

export type VisualizerFavorite = Pick<Visualizer, 'providerId' | 'name' | 'title'>;

class VisualizerStore extends Dexie {
    private readonly favorites!: Dexie.Table<VisualizerFavorite, [string, string]>;
    private readonly favorites$ = new BehaviorSubject<readonly VisualizerFavorite[]>([]);

    constructor() {
        super('ampcast/visualizers');

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

    addFavorite(visualizer: VisualizerFavorite): Promise<void>;
    addFavorite(providerId: VisualizerProviderId, name: string, title?: string): Promise<void>;
    async addFavorite(
        providerId: VisualizerProviderId | VisualizerFavorite,
        name = '',
        title?: string
    ): Promise<void> {
        if (typeof providerId !== 'string') {
            const visualizer = providerId;
            providerId = visualizer.providerId;
            name = visualizer.name;
            title = visualizer.title;
        }
        try {
            logger.log('addFavorite', {providerId, name, title});
            await this.favorites.put({providerId, name, title});
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
            logger.log('removeFavorite', {providerId, name});
            await this.favorites.delete([providerId, name]);
        } catch (err) {
            logger.error(err);
        }
    }
}

const visualizerStore = new VisualizerStore();

export default visualizerStore;
