import {LiteStorage} from 'utils';

const storage = new LiteStorage('youtube');

export default {
    get connectedAt(): number {
        return storage.getNumber('connectedAt');
    },

    set connectedAt(connectedAt: number) {
        storage.setNumber('connectedAt', connectedAt);
    },

    get enabled(): boolean {
        // The property `enabled` was added after `connectedAt`.
        // Hopefully this will always return `true` one day.
        if (!storage.hasItem('enabled') && this.connectedAt) {
            storage.setBoolean('enabled', true);
        }
        return storage.getBoolean('enabled');
    },

    clear(): void {
        storage.removeItem('connectedAt');
    },
};
