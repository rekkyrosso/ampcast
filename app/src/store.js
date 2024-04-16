const Store = require('electron-store');

const store = new Store({
    port: {type: 'number', default: 0},
});

module.exports = {
    get port() {
        return store.get('port');
    },

    set port(port) {
        store.set('port', Number(port) || 0);
    },
};
