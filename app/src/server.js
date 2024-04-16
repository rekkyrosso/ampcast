const {resolve} = require('path');
const {createServer} = require('net');
const express = require('express');
const store = require('./store');

const host = 'localhost';
const defaultPort = 29292;
const app = express();
const wwwDir = resolve(__dirname, '../www');
const webIndex = resolve(wwwDir, './index.html');

express.static.mime.define({
    'application/javascript': ['js'],
    'application/json': ['json'],
    'image/vnd.microsoft.icon': ['ico'],
    'image/png': ['png'],
    'image/svg+xml': ['svg'],
    'text/css': ['css'],
    'text/html': ['html'],
});

app.get('/', (_, res) => res.sendFile(webIndex));
app.use('/apple-touch-icon.png', express.static(resolve(wwwDir, './apple-touch-icon.png')));
app.use('/favicon.ico', express.static(resolve(wwwDir, './favicon.ico')));
app.use('/favicon.svg', express.static(resolve(wwwDir, './favicon.svg')));
app.use('/icon-192.png', express.static(resolve(wwwDir, './icon-192.png')));
app.use('/icon-512.png', express.static(resolve(wwwDir, './icon-512.png')));
app.use('/manifest.json', express.static(resolve(wwwDir, './manifest.json')));
app.use('/auth', express.static(resolve(wwwDir, './auth')));
app.get('/:version/:id.css', async (req, res) =>
    res.sendFile(resolve(wwwDir, `./${req.params.version}/${req.params.id}.css`))
);
app.get('/:version/:id.js', async (req, res) =>
    res.sendFile(resolve(wwwDir, `./${req.params.version}/${req.params.id}.js`))
);
app.get('/:version/lib/:id.js', async (req, res) =>
    res.sendFile(resolve(wwwDir, `./${req.params.version}/lib/${req.params.id}.js`))
);
app.get('*', (_, res) => res.redirect('/'));

let server = null;

async function start() {
    if (server) {
        return server.address().port;
    }
    let port = store.port;
    if (port) {
        try {
            await checkPort(port);
        } catch (err) {
            console.log(`Preferred port in use: ${port}`);
            port = await getFreePort(port);
        }
    } else {
        port = await getFreePort();
        store.port = port;
    }
    try {
        server = await getServer(port);
        return port;
    } catch (err) {
        throw Error('Could not start web server');
    }
}

async function stop() {
    return new Promise((resolve, reject) => {
        if (server) {
            server.close((err) => {
                if (err) {
                    console.error(err);
                    reject(err);
                } else {
                    const timestamp = new Date().toLocaleString();
                    console.info(`Server stopped at: ${timestamp}`);
                    resolve();
                }
            });
            server = null;
        } else {
            resolve();
        }
    });
}

async function getServer(port) {
    return new Promise((resolve, reject) => {
        const server = app.listen(port, host, (err) => {
            if (err) {
                reject(err);
            } else {
                const timestamp = new Date().toLocaleString();
                console.info(`Server started at: ${timestamp}`);
                console.info(`Serving from: http://${host}:${port}`);
                resolve(server);
            }
        });
    });
}

async function getFreePort(port = defaultPort, endPort = port + 20) {
    while (port <= endPort) {
        try {
            await checkPort(port);
            return port;
        } catch (err) {
            port++;
        }
    }
    throw Error('Could not find a free port');
}

async function checkPort(port) {
    return new Promise((resolve, reject) => {
        const server = createServer();
        server.unref();
        server.on('error', reject);
        server.listen({host, port}, () => {
            server.close(() => resolve());
        });
    });
}

module.exports = {
    start,
    stop,
};
