const path = require('path');
const fs = require('fs');
const net = require('net');
const http = require('http');
const store = require('./store');
const staticDir = path.resolve(__dirname, '../www');
const host = 'localhost';
const defaultPort = 29292;

const mimeTypes = {
    js: 'application/javascript',
    json: 'application/json',
    ico: 'image/vnd.microsoft.icon',
    png: 'image/png',
    svg: 'image/svg+xml',
    css: 'text/css',
    html: 'text/html',
    text: 'text/plain',
};

const app = http.createServer(async (req, res) => {
    const method = req.method;
    const url = req.url.replace(/[?#].*$/, '');
    try {
        let pathname = url;
        if (pathname === '/auth/spotify/callback/') {
            const host = req.headers.host || '';
            if (host.startsWith('[::1]:')) {
                const port = host.slice(6);
                console.log('Redirect:', {
                    from: `${host}${pathname}`,
                    to: `localhost:${port}${pathname}`,
                });
                res.writeHead(302, {Location: `http://localhost:${port}${req.url}`});
                res.end();
                return;
            }
        }
        if (pathname.endsWith('/')) {
            pathname += 'index.html';
        }
        const filePath = path.join(staticDir, pathname);
        const pathTraversal = !filePath.startsWith(staticDir);
        const exists =
            !pathTraversal &&
            (await fs.promises.stat(filePath).then(
                (stat) => stat.isFile(),
                () => false
            ));
        if (exists) {
            const ext = path.extname(pathname).substring(1).toLowerCase();
            const mimeType = mimeTypes[ext] || mimeTypes.text;
            const stream = fs.createReadStream(filePath);
            res.writeHead(200, {'Content-Type': mimeType});
            stream.pipe(res);
            console.info(`${method} ${url} OK`);
        } else {
            console.warn(`${method} ${url} NOT FOUND`);
            res.writeHead(404, {'Content-Type': mimeTypes.text});
            res.end('Not found');
        }
    } catch (err) {
        console.error(`${method} ${url} ERROR`);
        console.error(err);
        res.writeHead(500, {'Content-Type': mimeTypes.text});
        res.end('Internal server error');
    }
});

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
        const server = net.createServer();
        server.unref();
        server.on('error', reject);
        server.listen({host, port}, () => {
            server.close(() => resolve());
        });
    });
}

module.exports = {
    get port() {
        return server?.address().port || 0;
    },
    start,
    stop,
};
