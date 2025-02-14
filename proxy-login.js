const md5 = require('md5');
const argv = require('minimist')(process.argv.slice(2));
const dotenv = require('dotenv');
const isDocker = argv.host === '0.0.0.0';

async function handleProxyLogin(req, res) {
    dotenv.config({path: './.env'});
    const [, search] = req.url.split('?');
    const params = new URLSearchParams(search);
    const server = params.get('server');
    const url = params.get('url');
    const SERVER_ID = server.toUpperCase();
    const user = getEnv(`${SERVER_ID}_USER`);
    const password = getEnv(`${SERVER_ID}_PASSWORD`);
    console.log('proxy-login:', {server, url})
    if (!user || !password) {
        res.writeHead(407, {'Content-Type': 'text/plain'});
        res.end('Proxy Authentication Required');
        return;
    }
    try {
        switch (server) {
            case 'emby':
            case 'jellyfin':
                await simpleLogin(
                    req,
                    res,
                    url,
                    {Username: user, Pw: password},
                    {'X-Emby-Authorization': req.headers['x-emby-authorization']}
                );
                break;

            case 'navidrome':
                await simpleLogin(req, res, url, {username: user, password});
                break;

            default:
                await subsonicLogin(req, res, url, user, password);
        }
        console.info(`${req.method} ${url} OK`);
    } catch (err) {
        handleError(req, res, err);
    }
}

async function simpleLogin(req, res, url, params, headers = {}) {
    try {
        const response = await proxyFetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            body: JSON.stringify(params),
        });
        const text = await response.text();
        res.writeHead(response.ok ? 200 : response.status, {
            'Content-Type': response.headers.get('content-type'),
        });
        res.write(text);
        res.end();
    } catch (err) {
        if (err instanceof TypeError) {
            console.error(err);
            res.writeHead(404, {'Content-Type': 'text/plain'});
            res.end('Host not available');
        } else {
            handleError(req, res, err);
        }
    }
}

async function subsonicLogin(req, res, url, userName, password) {
    const login = async (params, handleErrors = false) => {
        const credentials = new URLSearchParams({
            u: userName,
            ...params,
            c: 'ampcast',
            f: 'json',
        });
        const response = await proxyFetch(`${url}?${credentials}`, {
            method: 'GET',
            headers: {Accept: 'application/json'},
        });
        if (!response.ok) {
            if (handleErrors) {
                console.error(response.statusText);
                const text = await response.text();
                res.writeHead(response.status, {
                    'Content-Type': response.headers.get('content-type'),
                });
                res.write(text);
                res.end();
                return;
            }
            throw response;
        }
        const json = await response.json();
        const {['subsonic-response']: data} = json;
        if (data.error) {
            if (handleErrors) {
                console.error(data.error);
                const text = JSON.stringify(json);
                res.writeHead(response.status, {
                    'Content-Type': response.headers.get('content-type'),
                });
                res.write(text);
                res.end();
                return;
            }
            throw data.error;
        }
        if (data.version) {
            credentials.set('v', data.version);
        }

        res.writeHead(200, {'Content-Type': 'application/json'});
        res.write(
            JSON.stringify({
                ['subsonic-response']: data,
                ['ampcast-response']: {
                    userName,
                    credentials: String(credentials),
                },
            })
        );
        res.end();
    };

    try {
        const salt = generateRandomString(12);
        const token = md5(password + salt);
        await login({
            t: token,
            s: salt,
            v: '1.13.0',
        });
    } catch (err) {
        if (err instanceof TypeError) {
            console.error(err);
            res.writeHead(404, {'Content-Type': 'text/plain'});
            res.end('Host not available');
        } else {
            try {
                console.error(err);
                console.log({url});
                console.log('Subsonic login failed. Attempting legacy login...');
                await login({
                    p: `enc:${Array.from(new TextEncoder().encode(password))
                        .map((byte) => byte.toString(16).padStart(2, '0'))
                        .join('')}`,
                    v: '1.12.0',
                });
            } catch (err) {
                try {
                    console.error(err);
                    console.log({url});
                    console.log('Subsonic login failed. Attempting simple login...');
                    await login({p: password, v: '1.12.0'}, true);
                } catch (err) {
                    handleError(req, res, err);
                }
            }
        }
    }
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
                    'Login from localhost failed. Attempting login from host.docker.internal...'
                );
                urlObject.hostname = 'host.docker.internal';
                const response = await fetchUrl(String(urlObject));
                return response;
            } catch (err) {
                if (err instanceof TypeError) {
                    console.log(
                        'Login from host.docker.internal failed. Attempting login from 127.0.0.1...'
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

function getEnv(key) {
    let value = String(process.env[key] || '');
    if (/^".*"$/.test(value)) {
        value = value.slice(1, -1);
    }
    return value.trim();
}

function generateRandomString(length = 21) {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
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

module.exports = handleProxyLogin;
