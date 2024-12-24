import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import {nanoid} from 'nanoid';
import {td_client_id} from 'services/credentials';
import {LiteStorage} from 'utils';

export interface TidalCredentials {
    readonly clientId: string;
}

const storage = new LiteStorage('tidal');
const userStorage = new LiteStorage('tidal/user', 'memory');
const credentials$ = new BehaviorSubject<TidalCredentials>({clientId: ''});

const tidalSettings = {
    get clientId(): string {
        return td_client_id || storage.getString('clientId');
    },

    set clientId(clientId: string) {
        if (!td_client_id) {
            storage.setString('clientId', clientId);
            credentials$.next({clientId});
        }
    },

    get connectedAt(): number {
        return storage.getNumber('connectedAt');
    },

    set connectedAt(connectedAt: number) {
        storage.setNumber('connectedAt', connectedAt);
    },

    get countryCode(): string {
        return userStorage.getString('countryCode');
    },

    set countryCode(countryCode: string) {
        userStorage.setString('countryCode', countryCode);
    },

    get credentialsRequired(): boolean {
        return !td_client_id;
    },

    get deviceId(): string {
        let deviceId = storage.getString('deviceId');
        if (!deviceId) {
            deviceId = nanoid();
            storage.setString('deviceId', deviceId);
        }
        return deviceId;
    },

    get disabled(): boolean {
        // TODO
        // return __tidal_disabled__ && !storage.getBoolean('enabled');
        return !storage.getBoolean('enabled');
    },

    get userId(): string {
        return userStorage.getString('userId');
    },

    set userId(userId: string) {
        userStorage.setString('userId', userId);
    },

    observeCredentials(this: unknown): Observable<TidalCredentials> {
        return credentials$;
    },

    getCredentials(this: unknown): TidalCredentials {
        return credentials$.value;
    },

    clear(): void {
        userStorage.clear();
    },
};

credentials$.next({clientId: tidalSettings.clientId});

export default tidalSettings;
