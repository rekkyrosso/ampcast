import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import {am_dev_token} from 'services/credentials';
import {LiteStorage} from 'utils';
import AppleBitrate from './AppleBitrate';

export interface AppleCredentials {
    readonly devToken: string;
}

const storage = new LiteStorage('apple');
const credentials$ = new BehaviorSubject<AppleCredentials>({devToken: ''});

const appleSettings = {
    get bitrate(): AppleBitrate {
        return storage.getNumber('bitrate', AppleBitrate.Standard);
    },

    set bitrate(bitrate: AppleBitrate) {
        storage.setNumber('bitrate', bitrate);
    },

    get connectedAt(): number {
        return storage.getNumber('connectedAt');
    },

    set connectedAt(connectedAt: number) {
        storage.setNumber('connectedAt', connectedAt);
    },

    get credentialsRequired(): boolean {
        return !am_dev_token;
    },

    get devToken(): string {
        return am_dev_token || storage.getString('devToken');
    },

    set devToken(devToken: string) {
        if (!am_dev_token) {
            storage.setString('devToken', devToken);
            credentials$.next({devToken});
        }
    },

    get favoriteSongsId(): string {
        return storage.getString('favoriteSongsId');
    },

    set favoriteSongsId(id: string) {
        storage.setString('favoriteSongsId', id);
    },

    observeCredentials(this: unknown): Observable<AppleCredentials> {
        return credentials$;
    },

    getCredentials(this: unknown): AppleCredentials {
        return credentials$.value;
    },
};

credentials$.next({devToken: appleSettings.devToken});

export default appleSettings;
