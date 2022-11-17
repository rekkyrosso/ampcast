import {LiteStorage} from 'utils';

const storage = new LiteStorage('layout');

export default {
    get(id: string, defaultValue = 0): number {
        return storage.getNumber(id, defaultValue);
    },

    set(id: string, value: number): void {
        storage.setNumber(id, value);
    },
};
