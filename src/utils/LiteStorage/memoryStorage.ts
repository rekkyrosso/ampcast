import {BasicStorage} from './LiteStorage';

const values = new Map<string, string>();

const memoryStorage: BasicStorage = {
    get length(): number {
        return values.size;
    },

    clear(): void {
        values.clear();
    },

    key(index: number): string | null {
        return [...values.keys()][index] ?? null;
    },

    getItem(key: string): string | null {
        return values.get(String(key)) ?? null;
    },

    setItem(key: string, value: string): void {
        values.set(String(key), String(value));
    },

    removeItem(key: string): void {
        values.delete(String(key));
    },
};

export default memoryStorage;
