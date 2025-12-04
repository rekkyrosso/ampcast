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
    js: 'application/javascript; charset=utf-8',
    json: 'application/json; charset=utf-8',
    ico: 'image/vnd.microsoft.icon',
    png: 'image/png',
    svg: 'image/svg+xml; charset=utf-8',
    css: 'text/css; charset=utf-8',
    html: 'text/html; charset=utf-8',
    text: 'text/plain; charset=utf-8',
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

let appHost = '';
async function handleGET(req, res) {
    const reqHost = req.headers.host || '';
    let pathname = req.url.replace(/[?#].*$/, '');
    if (pathname === '/proxy-login') {
        await handleProxyLogin(req, res);
        return;
    } else if (appHost && pathname === '/auth/spotify/callback/' && reqHost === `[::1]:${port}`) {
        // Route this back via the underlying host (not `[::1]`).
        console.log('Redirect:', {from: `${reqHost}${pathname}`, to: `${appHost}${pathname}`});
        res.writeHead(302, {Location: `http://${appHost}${req.url}`});
        res.end();
        return;
    }
    const staticDir = pathname === '/' || /\.(css|js)$/.test(pathname) ? runtimeDir : wwwDir;
    if (pathname.endsWith('/')) {
        pathname += 'index.html';
        if (pathname === '/index.html' && !appHost && !reqHost.startsWith('[::1]')) {
            // Set `appHost` on first request of the root of the app.
            // This might not be perfect but is probably good enough for this simple server.
            // We need to know the app's underlying host for any future redirects (e.g. Spotify).
            // Ignore this value if the host is [::1].
            appHost = reqHost;
            console.info({appHost});
        }
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
        console.info(`${req.method} ${pathname} OK`);
    } else {
        console.warn(`${req.method} ${pathname} NOT FOUND`);
        res.writeHead(404, {'Content-Type': mimeTypes.text});
        res.end('Not found');
    }
}

async function handlePOST(req, res) {
    const pathname = req.url.replace(/[?#].*$/, '');
    if (pathname === '/proxy-login') {
        await handleProxyLogin(req, res);
    } else {
        console.warn(`${req.method} ${pathname} FORBIDDEN`);
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
                locked: getEnv(`${SERVER_ID}_LOCKED`) === 'true',
            };
        }
    });
    let text = await fsp.readFile(path, 'utf8');
    [
        'APPLE_MUSIC_DEV_TOKEN',
        'GOOGLE_CLIENT_ID',
        'IBROADCAST_CLIENT_ID',
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
        const pathname = req.url.replace(/[?#].*$/, '');
        console.error(`${req.method} ${pathname} ERROR`);
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
