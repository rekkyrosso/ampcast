import LiteStorage from 'utils/LiteStorage';

const storage = new LiteStorage('layout');

export default {
    get(id: string, defaultValue = 0): number {
        const value = storage.getItem(id);
        return Number(value) || defaultValue;
    },

    set(id: string, value: number): void {
        storage.setItem(id, String(Number(value) || 0));
    },
};
