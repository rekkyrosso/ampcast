const values = new Map<string, string | null>();

export default {
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

    setItem(key: string, value: string | null): void {
        values.set(String(key), value === null ? null : String(value));
    },

    removeItem(key: string): void {
        values.delete(String(key));
    },
};
