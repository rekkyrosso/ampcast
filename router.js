const md5 = require('md5');
const httpProxy = require('http-proxy');
const consumers = require('stream/consumers');
const proxy = httpProxy.createProxyServer({});

async function router(req, res, defaultHandler) {
    try {
        if (req.url.startsWith('/bandcamp/api')) {
            handleBandcamp(req, res);
        } else if (req.url.startsWith('/lastfm/sign')) {
            handleLastFmSign(req, res);
        } else if (req.url.startsWith('/soundcloud/oauth/token')) {
            await handleSoundCloudAuth(req, res);
        } else {
            await defaultHandler(req, res);
        }
    } catch (err) {
        handleError(req, res, err);
    }
}

function handleBandcamp(req, res) {
    proxy.web(
        req,
        res,
        {
            target: `https://bandcamp.com/api/subsonic${req.url.replace('/bandcamp/api', '')}`,
            changeOrigin: true,
            followRedirects: true,
        },
        (err) => handleError(req, res, err)
    );
}

function handleLastFmSign(req, res) {
    const url = new URL(`http://abc.xyz${req.url}`);
    const api_key = url.searchParams.get('api_key');
    const api_secret = getEnv('LASTFM_API_SECRET');
    if (getEnv('LASTFM_API_KEY') === api_key && api_secret) {
        const text = url.searchParams.get('text');
        textResponse(req, res, 200, md5(text + api_secret));
    } else {
        textResponse(req, res, 403, 'Forbidden');
    }
}

async function handleSoundCloudAuth(req, res) {
    const text = await consumers.text(req);
    const params = new URLSearchParams(`?${text}`);
    const client_id = params.get('client_id');
    const client_secret = getEnv('SOUNDCLOUD_CLIENT_SECRET');
    if (getEnv('SOUNDCLOUD_CLIENT_ID') === client_id && client_secret) {
        params.set('client_secret', client_secret);
        const pathname = req.url.replace('/soundcloud', '');
        const response = await fetch(`https://secure.soundcloud.com${pathname}`, {
            method: req.method,
            headers: {
                Accept: 'application/json; charset=utf-8',
                'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
            },
            body: String(params),
        });
        const text = await response.text();
        if (response.ok) {
            jsonResponse(req, res, text);
        } else {
            textResponse(req, res, response.status, text);
        }
    } else {
        textResponse(req, res, 403, 'Forbidden');
    }
}

function handleError(req, res, err) {
    try {
        console.error(`${req.method} ${req.url} ERROR`);
        console.error(err);
        res.writeHead(500, {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store',
        });
    } catch (err) {
        console.error(err);
    }
    res.end('Internal server error');
}

function textResponse(req, res, status, text) {
    console.info(`${req.method} ${req.url} ${status}`);
    res.writeHead(status, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
    });
    res.end(text);
}

function jsonResponse(req, res, json) {
    console.info(`${req.method} ${req.url} OK`);
    res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
    });
    res.end(json);
}

function getEnv(key) {
    let value = String(process.env[key] || '');
    if (/^".*"$/.test(value)) {
        value = value.slice(1, -1);
    }
    return value.trim();
}

module.exports = router;
