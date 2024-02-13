import {LiteStorage} from 'utils';

const storage = new LiteStorage('electron');

export default {
    get port(): string {
        let port = storage.getString('port');
        if (port) {
            return port;
        }
        port = location.port;
        storage.setString('port', port);
        return port;
    },

    set port(port: string) {
        storage.setString('port', port);
    },
};
