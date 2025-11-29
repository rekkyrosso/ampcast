const argv = require('minimist')(process.argv.slice(2));
const isDocker = argv.host === '0.0.0.0';

const allowedRequestHeaders = ['content-type', 'authorization', 'user-agent'];
const allowedResponseHeaders = ['content-type'];

async function handleProxy(req, res) {
    const [, search] = req.url.split('?');
    const params = new URLSearchParams(search);
    const url = params.get('url');
    const method = req.method;
    console.log('proxy:', {url, method});
    try {
        const requestInit = {
            method: req.method,
            headers: filterHeaders(req.headers, allowedRequestHeaders),
        };
        if (method === 'POST') {
            const body = await getRequestBody(req);
            if (body) {
                requestInit.body = body;
            }
        }
        const response = await proxyFetch(url, requestInit);
        const text = await response.text();
        res.writeHead(response.status, filterHeaders(response.headers, allowedResponseHeaders));
        res.write(text);
        res.end();
        console.info(`${method} ${url} OK`);
    } catch (err) {
        handleError(req, res, err);
    }
}

function getRequestBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => {
            data += chunk.toString();
        });
        req.on('end', () => {
            resolve(data);
        });
    });
}

function filterHeaders(headers, allowedHeaders) {
    const filteredHeaders = {};
    allowedHeaders.forEach((name) => {
        const header = headers.get?.(name) || headers[name];
        if (header) {
            filteredHeaders[name] = header;
        }
    });
    return filteredHeaders;
}

async function proxyFetch(url, init) {
    const fetchUrl = (url) => fetch(url, init);
    let urlObject;
    try {
        urlObject = new URL(url);
    } catch (err) {
        console.log('Failed to parse URL:', {url});
        console.error(err);
        throw Error('Invalid URL');
    }
    try {
        const response = await fetchUrl(url);
        return response;
    } catch (err) {
        if (isDocker && err instanceof TypeError && urlObject.hostname === 'localhost') {
            try {
                console.log(
                    'Fetch from localhost failed. Attempting fetch from host.docker.internal...'
                );
                urlObject.hostname = 'host.docker.internal';
                const response = await fetchUrl(String(urlObject));
                return response;
            } catch (err) {
                if (err instanceof TypeError) {
                    console.log(
                        'Fetch from host.docker.internal failed. Attempting fetch from 127.0.0.1...'
                    );
                    urlObject.hostname = '127.0.0.1';
                    const response = await fetchUrl(String(urlObject));
                    return response;
                }
            }
        }
        throw err;
    }
}

function handleError(req, res, error) {
    try {
        const pathname = req.url.replace(/[?#].*$/, '');
        console.error(`${req.method} ${pathname} ERROR`);
        console.error(error);
        res.writeHead(500, {'Content-Type': 'text/plain'});
    } catch (err) {
        console.error(err);
    }
    res.end('Internal server error');
}

module.exports = handleProxy;
