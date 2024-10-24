import type {Observable} from 'rxjs';
import {filter, fromEvent, map, merge, Subject} from 'rxjs';
import memoryStorage from './memoryStorage';

export default class LiteStorage {
    private static readonly ids: string[] = [];
    private static readonly event$ = fromEvent<StorageEvent>(window, 'storage');
    readonly id: string;
    private readonly storage: Storage;
    private readonly changes$ = new Subject<void>();

    constructor(id: string, storage: 'local' | 'session' | 'memory' = 'local') {
        const storageId = `${storage}-${id}`;
        if (LiteStorage.ids.includes(storageId)) {
            throw Error(`Duplicate storageId: ${storageId}`);
        } else {
            LiteStorage.ids.push(storageId);
        }

        this.id = `${__app_name__}/${id}`;

        switch (storage) {
            case 'local':
                this.storage = localStorage;
                break;

            case 'session':
                this.storage = sessionStorage;
                break;

            case 'memory':
                this.storage = memoryStorage;
                break;
        }
    }

    observeChanges(): Observable<void> {
        return merge(
            this.changes$,
            LiteStorage.event$.pipe(
                filter(
                    (event) =>
                        !!event.key?.startsWith(`${this.id}/`) && event.storageArea === this.storage
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
            console.error(err);
        }
        return defaultValue;
    }

    setJson<T>(key: string, value: T): void {
        try {
            if (value == null) {
                this.removeItem(key);
            } else {
                this.setItem(key, JSON.stringify(value));
            }
        } catch (err) {
            console.error(err);
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
        return this.storage.getItem(`${this.id}/${key}`);
    }

    hasItem(key: string): boolean {
        return this.getItem(key) !== null;
    }

    setItem(key: string, value: string | null): void {
        key = `${this.id}/${key}`;
        if (value == null) {
            this.storage.removeItem(key);
        } else {
            this.storage.setItem(key, value);
        }
        this.changes$.next();
    }

    removeItem(key: string): void {
        this.storage.removeItem(`${this.id}/${key}`);
        this.changes$.next();
    }

    clear(): void {
        const id = `${this.id}/`;
        const keys: string[] = [];
        for (let i = 0; i < this.storage.length; i++) {
            const key = this.storage.key(i)!;
            if (key.startsWith(id)) {
                keys.push(key);
            }
        }
        keys.forEach((key) => this.storage.removeItem(key));
        this.changes$.next();
    }
}
