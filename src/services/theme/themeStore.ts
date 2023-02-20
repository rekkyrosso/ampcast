import Dexie from 'dexie';
import Theme from 'types/Theme';
import {Logger} from 'utils';
import themes from './themes';

const logger = new Logger('themeStore');

class ThemeStore extends Dexie {
    private readonly defaultThemes = new Map<string, Theme>(
        themes.map((theme) => [theme.name, theme])
    );
    private readonly themes!: Dexie.Table<Theme, string>;

    constructor() {
        super('ampcast/themes');

        this.version(1).stores({
            themes: `&name`,
        });
    }

    isDefaultTheme(theme: string | Theme): boolean {
        return this.defaultThemes.has(typeof theme === 'string' ? theme : theme.name);
    }

    async getDefaultThemes(): Promise<readonly Theme[]> {
        return [...this.defaultThemes.values()];
    }

    async getUserThemes(): Promise<readonly Theme[]> {
        return this.themes.toArray();
    }

    async load(name: string): Promise<Theme | undefined> {
        if (this.isDefaultTheme(name)) {
            return this.defaultThemes.get(name);
        }
        return this.themes.get(name);
    }

    async save(theme: Theme): Promise<void> {
        if (this.isDefaultTheme(theme)) {
            throw Error(`Cannot overwrite default theme '${theme.name}'.`);
        }
        try {
            logger.log('save', {theme});
            await this.themes.put(theme);
        } catch (err) {
            logger.error(err);
        }
    }

    async remove(name: string): Promise<void> {
        if (this.defaultThemes.has(name)) {
            throw Error(`Cannot delete default theme '${name}'.`);
        }
        try {
            logger.log('remove', {name});
            await this.themes.delete(name);
        } catch (err) {
            logger.error(err);
        }
    }
}

const themeStore = new ThemeStore();

export default themeStore;
