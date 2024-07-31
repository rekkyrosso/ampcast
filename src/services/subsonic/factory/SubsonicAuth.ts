import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged, filter, mergeMap} from 'rxjs';
import Auth from 'types/Auth';
import {Logger} from 'utils';
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

        this.credentials$.next(this.settings.credentials);
    }

    isConnected(): boolean {
        return !!this.settings.credentials;
    }

    isLoggedIn(): boolean {
        return this.isLoggedIn$.getValue();
    }

    observeIsLoggedIn(): Observable<boolean> {
        return this.isLoggedIn$.pipe(distinctUntilChanged());
    }

    async login(): Promise<void> {
        if (!this.isLoggedIn()) {
            this.logger.log('connect');
            try {
                const returnValue = await showSubsonicLoginDialog(this.service);
                if (returnValue) {
                    const {userName, credentials} = JSON.parse(returnValue);
                    this.settings.userName = userName;
                    this.setCredentials(credentials);
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
