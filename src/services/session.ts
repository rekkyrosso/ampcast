import {nanoid} from 'nanoid';
import {LiteStorage} from 'utils';

const storage = new LiteStorage('session', 'session');

const session = {
    get id(): string {
        let id = storage.getString('id');
        if (id) {
            return id;
        }
        id = nanoid();
        storage.setString('id', id);
        return id;
    },

    get miniPlayerId(): string {
        let miniPlayerId = storage.getString('miniPlayerId');
        if (miniPlayerId) {
            return miniPlayerId;
        }
        miniPlayerId = nanoid();
        storage.setString('miniPlayerId', miniPlayerId);
        return miniPlayerId;
    },
};

export default session;