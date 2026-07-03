import {LiteStorage} from 'utils';
import {t} from 'services/i18n';
import {getService} from 'services/mediaServices';
import {MediaSourceError} from './errors';

export default class MusicCatalogRequiredError extends MediaSourceError {
    private static localStorage = new LiteStorage('ignoreCatalogRequired');
    private static sessionStorage = new LiteStorage('ignoreCatalogRequired', 'session');

    static canIgnore(id: string): boolean {
        return (
            getService('apple')?.isLoggedIn() ||
            getService('spotify')?.isLoggedIn() ||
            this.localStorage.getBoolean(id) ||
            this.sessionStorage.getBoolean(id)
        );
    }

    readonly message = t('Music catalog required');
    readonly ignore: (forever: boolean) => void;

    constructor(id: string, callback: () => void) {
        super();
        this.ignore = (forever: boolean) => {
            MusicCatalogRequiredError.sessionStorage.setBoolean(id, true);
            MusicCatalogRequiredError.localStorage.setBoolean(id, forever);
            callback();
        };
    }
}
