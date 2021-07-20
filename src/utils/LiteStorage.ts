type BasicStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'clear'>;

export default class LiteStorage implements BasicStorage {
    public readonly id: string;

    constructor(id: string, private readonly storage: Storage = localStorage) {
        this.id = `ampcast/${id}`;
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
