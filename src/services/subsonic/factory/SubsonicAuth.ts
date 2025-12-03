import type {Observable} from 'rxjs';
import {BehaviorSubject, Subject, distinctUntilChanged, filter, mergeMap} from 'rxjs';
import Auth from 'types/Auth';
import {Logger} from 'utils';
import {getReadableErrorMessage} from 'services/errors';
import {getServerHost, hasProxyLogin} from 'services/mediaServices/buildConfig';
import {showSubsonicLoginDialog} from './components/SubsonicLoginDialog';
import SubsonicApi from './SubsonicApi';
import SubsonicService from './SubsonicService';
import SubsonicSettings from './SubsonicSettings';

export default class SubsonicAuth implements Auth {
    private logger = new Logger(`${this.service.id}Auth`);
    private credentials$ = new BehaviorSubject('');
    private connecting$ = new BehaviorSubject(false);
    private connectionLogging$ = new Subject<string>();
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

    observeConnecting(): Observable<boolean> {
        return this.connecting$.pipe(distinctUntilChanged());
    }

    observeConnectionLogging(): Observable<string> {
        return this.connectionLogging$;
    }

    observeIsLoggedIn(): Observable<boolean> {
        return this.isLoggedIn$.pipe(distinctUntilChanged());
    }

    async login(mode?: 'silent'): Promise<void> {
        if (!this.isLoggedIn()) {
            this.logger.log('connect');
            try {
                this.connectionLogging$.next('');
                let returnValue = '';
                if (mode === 'silent') {
                    this.connecting$.next(true);
                    if (hasProxyLogin(this.service)) {
                        const host = getServerHost(this.service);
                        returnValue = await this.api.login(host, '', '', true);
                    } else {
                        throw Error('No credentials');
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
                this.connectionLogging$.next(
                    `Failed to connect: '${getReadableErrorMessage(err)}'`
                );
            }
            this.connecting$.next(false);
        }
    }

    async logout(): Promise<void> {
        this.logger.log('disconnect');
        this.settings.clear();
        this.setCredentials('');
        this.isLoggedIn$.next(false);
        this.settings.connectedAt = 0;
        this.connecting$.next(false);
    }

    async reconnect(): Promise<void> {
        const credentials = this.settings.credentials;
        if (credentials) {
            this.connecting$.next(true);
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
                this.connectionLogging$.next('Not authorized');
            } else {
                this.logger.error(err);
                this.connectionLogging$.next(
                    `Failed to connect: '${getReadableErrorMessage(err)}'`
                );
            }
            this.credentials$.next('');
            return false;
        } finally {
            this.connecting$.next(false);
        }
    }
}
