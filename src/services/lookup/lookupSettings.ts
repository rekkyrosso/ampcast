import {LiteStorage} from 'utils';

const storage = new LiteStorage('lookup');

export default {
    get preferPersonalMedia(): boolean {
        return storage.getBoolean('preferPersonalMedia');
    },

    set preferPersonalMedia(preferPersonalMedia: boolean) {
        storage.setBoolean('preferPersonalMedia', preferPersonalMedia);
    },
};
