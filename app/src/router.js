import httpProxy from 'http-proxy';
import consumers from 'stream/consumers';

const proxy = httpProxy.createProxyServer({});

export default async function router(req, res, defaultHandler) {
    try {
        if (req.url.startsWith('/bandcamp/api')) {
            handleBandcamp(req, res);
        } else if (req.url.startsWith('/soundcloud/oauth/token')) {
            await handleSoundCloudAuth(req, res);
        } else if (req.url.startsWith('/stream')) {
            handleStream(req, res);
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

async function handleSoundCloudAuth(req, res) {
    const data = await consumers.text(req);
    const response = await fetch(`https://ampcast.dev${req.url}`, {
        method: req.method,
        headers: {
            Accept: 'application/json; charset=utf-8',
            'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
        },
        body: data,
    });
    const text = await response.text();
    if (response.ok) {
        jsonResponse(req, res, text);
    } else {
        textResponse(req, res, response.status, text);
    }
}

function handleStream(req, res) {
    if (req.headers.origin) {
        const originUrl = new URL(req.headers.origin);
        if (originUrl.origin !== req.headers.host) {
            textResponse(req, res, 403, 'Forbidden');
            return;
        }
    }

    const urlObject = new URL(`http://abc.xyz${req.url}`);
    const url = urlObject.searchParams.get('url');
    const targetUrl = new URL(url);
    targetUrl.searchParams.set('ampcast', 1);

    console.log('PROXY', url);

    proxy.web(
        req,
        res,
        {
            target: targetUrl.href,
            changeOrigin: true,
            followRedirects: true,
            headers: {
                referer: '',
            },
        },
        (err) => handleError(req, res, err)
    );
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
