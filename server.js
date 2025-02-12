const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const http = require('http');
const argv = require('minimist')(process.argv.slice(2));
const dotenv = require('dotenv');
const handleProxyLogin = require('./proxy-login');
const {host = 'localhost', port = 8000} = argv;
const wwwDir = path.resolve(__dirname, './app/www');
const devDir = path.resolve(__dirname, './www-dev');
const runtimeDir = argv.dev ? devDir : wwwDir;

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

const server = http.createServer(async (req, res) => {
    try {
        switch (req.method) {
            case 'GET': {
                await handleGET(req, res);
                return;
            }
            case 'POST': {
                await handlePOST(req, res);
                return;
            }

            default: {
                console.warn(`${req.method} ${req.url} FORBIDDEN`);
                res.writeHead(403, {'Content-Type': mimeTypes.text});
                res.end('Forbidden');
            }
        }
    } catch (err) {
        handleError(req, res, err);
    }
});

async function handleGET(req, res) {
    let pathname = req.url.replace(/[?#].*$/, '');
    if (pathname === '/proxy-login') {
        await handleProxyLogin(req, res);
        return;
    }
    const staticDir = pathname === '/' || /\.(css|js)$/.test(pathname) ? runtimeDir : wwwDir;
    if (pathname.endsWith('/')) {
        pathname += 'index.html';
    }
    const filePath = path.join(staticDir, pathname);
    const pathTraversal = !filePath.startsWith(staticDir);
    const exists =
        !pathTraversal &&
        (await fsp.stat(filePath).then(
            (stat) => stat.isFile(),
            () => false
        ));
    if (exists) {
        const ext = path.extname(pathname).substring(1).toLowerCase();
        const mimeType = mimeTypes[ext] || mimeTypes.text;
        res.writeHead(200, {'Content-Type': mimeType});
        if (pathname.endsWith('/bundle.js')) {
            await handleBundleJs(res, filePath);
        } else {
            const stream = fs.createReadStream(filePath);
            stream.pipe(res);
        }
        // console.info(`${req.method} ${req.url} OK`);
    } else {
        console.warn(`${req.method} ${req.url} NOT FOUND`);
        res.writeHead(404, {'Content-Type': mimeTypes.text});
        res.end('Not found');
    }
}

async function handlePOST(req, res) {
    let pathname = req.url.replace(/[?#].*$/, '');
    if (pathname === '/proxy-login') {
        await handleProxyLogin(req, res);
    } else {
        console.warn(`${req.method} ${req.url} FORBIDDEN`);
        res.writeHead(403, {'Content-Type': mimeTypes.text});
        res.end('Forbidden');
    }
}

async function handleBundleJs(res, path) {
    dotenv.config({path: './.env'});
    const personalMediaServers = {};
    'airsonic|ampache|emby|gonic|jellyfin|navidrome|subsonic'.split('|').forEach((serverId) => {
        const SERVER_ID = serverId.toUpperCase();
        const host = getEnv(`${SERVER_ID}_HOST`).replace(/\/+$/, '');
        if (host) {
            personalMediaServers[serverId] = {
                host,
                hasProxyLogin: !!(getEnv(`${SERVER_ID}_USER`) && getEnv(`${SERVER_ID}_PASSWORD`)),
            };
        }
    });
    let text = await fsp.readFile(path, 'utf8');
    [
        'APPLE_MUSIC_DEV_TOKEN',
        'GOOGLE_CLIENT_ID',
        'LASTFM_API_KEY',
        'LASTFM_API_SECRET',
        'SPOTIFY_CLIENT_ID',
        'TIDAL_CLIENT_ID',
        'ENABLED_SERVICES',
        'STARTUP_SERVICES',
    ].forEach((key) => {
        text = text.replace(`%${key}%`, encodeString(getEnv(key)));
    });

    text = text.replace(
        '%PERSONAL_MEDIA_SERVERS%',
        encodeString(JSON.stringify(personalMediaServers))
    );

    res.write(text);
    res.end();
}

function handleError(req, res, err) {
    try {
        console.error(`${req.method} ${req.url} ERROR`);
        console.error(err);
        res.writeHead(500, {'Content-Type': mimeTypes.text});
    } catch (err) {
        console.error(err);
    }
    res.end('Internal server error');
}

function getEnv(key) {
    let value = String(process.env[key] || '');
    if (/^".*"$/.test(value)) {
        value = value.slice(1, -1);
    }
    return value.trim();
}

function encodeString(string) {
    const encoder = new TextEncoder();
    return encoder.encode(string).join(',');
}

server.listen(port, host, () => {
    const timestamp = new Date().toLocaleString();
    console.info(`Serving from: http://${host}:${port}`);
    console.info(`Using files from: ${runtimeDir}`);
    console.info(`Server started at: ${timestamp}`);
});
