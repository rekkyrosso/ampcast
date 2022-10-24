type BasicStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'clear'>;

export default class LiteStorage implements BasicStorage {
    public readonly id: string;

    constructor(id: string, private readonly storage: Storage = localStorage) {
        this.id = `ampcast/${id}`;
    }

    getBoolean(key: string, defaultValue = false): boolean {
        return Boolean(this.getItem(key) ?? defaultValue);
    }

    setBoolean(key: string, value: boolean): void {
        this.setItem(key, String(!!value));
    }

    getJson<T>(key: string, defaultValue: T | null = null): T | null {
        const json = this.getItem(key);
        return json ? JSON.parse(json) : defaultValue;
    }

    setJson<T>(key: string, value: T): void {
        if (value == null) {
            this.removeItem(key);
        } else {
            this.setItem(key, JSON.stringify(value));
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
        const keys: string[] = [];
        for (let i = 0; i < this.storage.length; i++) {
            const key = this.storage.key(i);
            if (key?.startsWith(`${this.id}/`)) {
                keys.push(key);
            }
        }
        keys.forEach((key) => this.storage.removeItem(key));
    }
}
