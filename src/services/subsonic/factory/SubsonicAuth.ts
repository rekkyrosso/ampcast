import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged, filter, mergeMap} from 'rxjs';
import Auth from 'types/Auth';
import {Logger} from 'utils';
import {getServerHost, hasProxyLogin} from 'services/buildConfig';
import {showSubsonicLoginDialog} from './components/SubsonicLoginDialog';
import SubsonicApi from './SubsonicApi';
import SubsonicService from './SubsonicService';
import SubsonicSettings from './SubsonicSettings';

export default class SubsonicAuth implements Auth {
    private logger = new Logger(`${this.service.id}Auth`);
    private credentials$ = new BehaviorSubject('');
    private isLoggedIn$ = new BehaviorSubject(false);

    constructor(private readonly service: SubsonicService) {
        this.observeCredentials()
            .pipe(
                filter((credentials) => credentials !== ''),
                mergeMap(() => this.checkConnection())
            )
            .subscribe(this.isLoggedIn$);
    }

    isConnected(): boolean {
        return !!this.settings.connectedAt;
    }

    isLoggedIn(): boolean {
        return this.isLoggedIn$.value;
    }

    observeIsLoggedIn(): Observable<boolean> {
        return this.isLoggedIn$.pipe(distinctUntilChanged());
    }

    async login(mode?: 'silent'): Promise<void> {
        if (!this.isLoggedIn()) {
            this.logger.log('connect');
            try {
                let returnValue = '';
                if (mode === 'silent') {
                    if (hasProxyLogin(this.service)) {
                        const host = getServerHost(this.service);
                        returnValue = await this.api.login(host, '', '', true);
                    } else {
                        this.logger.warn('No credentials for proxy login');
                    }
                } else {
                    returnValue = await showSubsonicLoginDialog(this.service);
                }
                if (returnValue) {
                    const {userName, credentials} = JSON.parse(returnValue);
                    this.settings.userName = userName;
                    this.setCredentials(credentials);
                    this.settings.connectedAt = Date.now();
                }
            } catch (err) {
                this.logger.error(err);
            }
        }
    }

    async logout(): Promise<void> {
        this.logger.log('disconnect');
        this.settings.clear();
        this.setCredentials('');
        this.isLoggedIn$.next(false);
        this.settings.connectedAt = 0;
    }

    async reconnect(): Promise<void> {
        const credentials = this.settings.credentials;
        if (credentials) {
            this.credentials$.next(credentials);
        } else if (hasProxyLogin(this.service)) {
            await this.login('silent');
        }
    }

    private get api(): SubsonicApi {
        return this.service.api;
    }

    private get settings(): SubsonicSettings {
        return this.service.settings;
    }

    private observeCredentials(): Observable<string> {
        return this.credentials$.pipe(distinctUntilChanged());
    }

    private setCredentials(credentials: string): void {
        this.settings.credentials = credentials;
        this.credentials$.next(credentials);
    }

    private async checkConnection(): Promise<boolean> {
        try {
            const libraries = await this.api.getMusicLibraries();
            this.settings.libraries = libraries;
            return true;
        } catch (err: any) {
            if (err.code === 40) {
                this.settings.credentials = '';
            } else {
                this.logger.error(err);
            }
            this.credentials$.next('');
            return false;
        }
    }
}
