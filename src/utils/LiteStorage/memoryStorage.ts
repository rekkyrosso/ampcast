const items = new Map<string, string>();

const memoryStorage: Storage = {
    get length(): number {
        return items.size;
    },

    clear(): void {
        items.clear();
    },

    key(index: number): string | null {
        return [...items.keys()][index] ?? null;
    },

    getItem(key: string): string | null {
        return items.get(String(key)) ?? null;
    },

    setItem(key: string, value: string): void {
        items.set(String(key), String(value));
    },

    removeItem(key: string): void {
        items.delete(String(key));
    },
};

export default memoryStorage;
