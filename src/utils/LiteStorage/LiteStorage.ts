import type {Observable} from 'rxjs';
import {filter, fromEvent, map, merge, Subject} from 'rxjs';
import Logger from '../Logger';
import memoryStorage from './memoryStorage';

const logger = new Logger('LiteStorage');

export default class LiteStorage {
    private static readonly ids: string[] = [];
    private static readonly event$ = fromEvent<StorageEvent>(window, 'storage');
    readonly id: string;
    private readonly storageArea: Storage;
    private readonly change$ = new Subject<void>();

    constructor(id: string, area: 'local' | 'session' | 'memory' = 'local') {
        const storageId = `${area}-${id}`;
        if (LiteStorage.ids.includes(storageId)) {
            throw Error(`Duplicate storageId: ${storageId}`);
        } else {
            LiteStorage.ids.push(storageId);
        }

        this.id = `${__app_name__}/${id}`;

        switch (area) {
            case 'local':
                this.storageArea = localStorage;
                break;

            case 'session':
                this.storageArea = sessionStorage;
                break;

            case 'memory':
                this.storageArea = memoryStorage;
                break;
        }
    }

    observeChange(): Observable<void> {
        return merge(
            this.change$,
            LiteStorage.event$.pipe(
                filter(
                    (event) =>
                        !!event.key?.startsWith(`${this.id}/`) &&
                        event.storageArea === this.storageArea
                ),
                map(() => undefined)
            )
        );
    }

    getBoolean(key: string, defaultValue = false): boolean {
        const value = this.getItem(key) ?? defaultValue;
        return value === true || value === 'true';
    }

    setBoolean(key: string, value: boolean): void {
        this.setItem(key, String(!!value));
    }

    getJson<T>(key: string): T | null;
    getJson<T>(key: string, defaultValue: T): T;
    getJson<T>(key: string, defaultValue: T | null = null): T | null {
        const json = this.getItem(key);
        try {
            return json ? JSON.parse(json) : defaultValue;
        } catch (err) {
            logger.info('JSON.parse:', key);
            logger.error(err);
            return defaultValue;
        }
    }

    setJson<T>(key: string, value: T): void {
        try {
            if (value == null) {
                this.removeItem(key);
            } else {
                this.setItem(key, JSON.stringify(value));
            }
        } catch (err) {
            logger.info('JSON.stringify:', key);
            logger.error(err);
        }
    }

    getNumber(key: string, defaultValue = 0): number {
        const value = Number(this.getItem(key) ?? defaultValue);
        return isNaN(value) ? defaultValue : value;
    }

    setNumber(key: string, value: number): void {
        this.setItem(key, String(Number(value)));
    }

    getString<T extends string | ''>(key: string, defaultValue: T | '' = ''): T {
        return String(this.getItem(key) ?? defaultValue) as T;
    }

    setString<T extends string>(key: string, value: T): void {
        this.setItem(key, value);
    }

    getItem(key: string): string | null {
        return this.storageArea.getItem(`${this.id}/${key}`);
    }

    hasItem(key: string): boolean {
        return this.getItem(key) !== null;
    }

    setItem(key: string, value: string): void {
        key = `${this.id}/${key}`;
        value = String(value);
        const prevValue = this.storageArea.getItem(key);
        if (value !== prevValue) {
            this.storageArea.setItem(key, value);
            this.change$.next();
        }
    }

    removeItem(key: string): void {
        if (this.hasItem(key)) {
            this.storageArea.removeItem(`${this.id}/${key}`);
            this.change$.next();
        }
    }

    clear(): void {
        const id = `${this.id}/`;
        const keys: string[] = [];
        for (let i = 0; i < this.storageArea.length; i++) {
            const key = this.storageArea.key(i);
            if (key?.startsWith(id)) {
                keys.push(key);
            }
        }
        if (keys.length > 0) {
            keys.forEach((key) => this.storageArea.removeItem(key));
            this.change$.next();
        }
    }
}
