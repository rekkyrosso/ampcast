import {LiteStorage} from 'utils';

const storage = new LiteStorage('lookup');

export default {
    get preferredService(): string {
        return storage.getString('preferredService');
    },

    set preferredService(preferredService: string) {
        storage.setString('preferredService', preferredService);
    },
};
