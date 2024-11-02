import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import Dexie, {liveQuery} from 'dexie';
import Theme from 'types/Theme';
import UserTheme from 'types/UserTheme';
import {Logger} from 'utils';
import theme from './theme';
import themes from './themes';

const logger = new Logger('themeStore');

class ThemeStore extends Dexie {
    private readonly defaultThemes = new Map<string, Theme>(
        themes.map((theme) => [theme.name, theme])
    );
    private readonly themes!: Dexie.Table<UserTheme, string>;
    private readonly themes$ = new BehaviorSubject<readonly UserTheme[]>([]);

    constructor() {
        super('ampcast/themes');

        this.version(1).stores({
            themes: `&name`,
        });

        liveQuery(() => this.themes.toArray()).subscribe((userThemes) =>
            this.themes$.next(
                userThemes
                    .sort((a, b) => a.name.localeCompare(b.name, undefined, {sensitivity: 'base'}))
                    .map((userTheme) => ({
                        ...userTheme,
                        toJSON: () => theme.toJSON(userTheme),
                    }))
            )
        );
    }

    observeUserThemes(): Observable<readonly UserTheme[]> {
        return this.themes$;
    }

    getDefaultTheme(name: string): Theme | undefined {
        return this.defaultThemes.get(name);
    }

    getDefaultThemes(): readonly Theme[] {
        return [...this.defaultThemes.values()];
    }

    getUserTheme(name: string): UserTheme | undefined {
        return this.getUserThemes().find((theme) => theme.name === name);
    }

    getUserThemes(): readonly UserTheme[] {
        return this.themes$.getValue();
    }

    async addUserTheme(theme: Theme): Promise<void> {
        try {
            logger.log('addUserTheme', theme.name);
            await this.themes.put({...theme, userTheme: true});
        } catch (err) {
            logger.error(err);
        }
    }

    async addUserThemes(themes: readonly Theme[]): Promise<void> {
        try {
            logger.log('addUserThemes', themes.length);
            await this.themes.bulkPut(themes.map((theme) => ({...theme, userTheme: true})));
        } catch (err) {
            logger.error(err);
        }
    }

    async removeUserTheme(name: string): Promise<void> {
        try {
            logger.log('removeUserTheme', name);
            await this.themes.delete(name);
        } catch (err) {
            logger.error(err);
        }
    }

    async renameUserTheme(oldName: string, newName: string): Promise<void> {
        try {
            const theme = await this.themes.get(oldName);
            if (!theme) {
                throw Error(`Theme '${oldName}' not found.`);
            }
            await this.themes.delete(oldName);
            await this.themes.put({...theme, name: newName, userTheme: true});
        } catch (err) {
            logger.error(err);
        }
    }
}

const themeStore = new ThemeStore();

export default themeStore;
