import {yt_api_key, yt_client_id} from 'services/credentials';
import {LiteStorage} from 'utils';

const storage = new LiteStorage('youtube');

export default {
    get apiKey(): string {
        return yt_api_key || storage.getString('apiKey');
    },

    set apiKey(apiKey: string) {
        storage.setString('apiKey', apiKey);
    },

    get clientId(): string {
        return yt_client_id || storage.getString('clientId');
    },

    set clientId(clientId: string) {
        storage.setString('clientId', clientId);
    },

    get connectedAt(): number {
        return storage.getNumber('connectedAt');
    },

    set connectedAt(connectedAt: number) {
        storage.setNumber('connectedAt', connectedAt);
    },

    get disabled(): boolean {
        return __youtube_disabled__ && !storage.getBoolean('enabled');
    },
};
