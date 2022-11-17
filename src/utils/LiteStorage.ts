import memoryStorage from './memoryStorage';
import Logger from './Logger';

const logger = new Logger('LiteStorage');

type BasicStorage = Pick<
    Storage,
    'getItem' | 'setItem' | 'removeItem' | 'clear' | 'key' | 'length'
>;

export default class LiteStorage {
    public readonly id: string;
    private readonly storage: BasicStorage;

    constructor(id: string, storage: 'local' | 'session' | 'memory' = 'local') {
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

    getBoolean(key: string): boolean {
        const value = this.getItem(key);
        return !!value && value !== 'false';
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
            logger.error(err);
            return defaultValue;
        }
    }

    setJson<T>(key: string, value: T): void {
        try {
            this.setItem(key, JSON.stringify(value));
        } catch (err) {
            logger.error(err);
        }
    }

    getNumber(key: string, defaultValue = 0): number {
        const value = Number(this.getItem(key) ?? defaultValue);
        return isNaN(value) ? defaultValue : value;
    }

    setNumber(key: string, value: number): void {
        this.setItem(key, String(Number(value) || 0));
    }

    getString(key: string, defaultValue = ''): string {
        return String(this.getItem(key) ?? defaultValue);
    }

    setString(key: string, value: string): void {
        this.setItem(key, value);
    }

    getItem(key: string): string | null {
        return this.storage.getItem(`${this.id}/${key}`);
    }

    setItem(key: string, value: string): void {
        this.storage.setItem(`${this.id}/${key}`, value ?? '');
    }

    removeItem(key: string): void {
        this.storage.removeItem(`${this.id}/${key}`);
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
    }
}
