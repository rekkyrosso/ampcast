export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        if (url.pathname.startsWith('/soundcloud/oauth/token')) {
            return handleSoundCloudAuthToken(request, env);
        }
        return env.ASSETS.fetch(request);
    },
};

async function handleSoundCloudAuthToken(request, env) {
    try {
        const url = new URL(request.url);
        const text = await request.text();
        const params = new URLSearchParams(`?${text}`);
        const client_id = params.get('client_id');
        const client_secret = env.SOUNDCLOUD_CLIENT_SECRET;
        if (env.SOUNDCLOUD_CLIENT_ID === client_id && client_secret) {
            params.set('client_secret', client_secret);
            const pathname = url.pathname.replace('/soundcloud', '');
            const response = await fetch(`https://secure.soundcloud.com${pathname}`, {
                method: request.method,
                headers: {
                    Accept: 'application/json;charset=utf-8',
                    'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
                },
                body: String(params),
            });
            const text = await response.text();
            if (response.ok) {
                return jsonResponse(text);
            } else {
                return textResponse(text, response.status);
            }
        } else {
            return textResponse('Forbidden', 403);
        }
    } catch {
        return textResponse('Internal server error', 500);
    }
}

function textResponse(text, status) {
    const headers = new Headers({
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
    });
    return new Response(text, {
        status,
        headers,
    });
}

function jsonResponse(json, status = 200) {
    const headers = new Headers({
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
    });
    return new Response(json, {
        status,
        headers,
    });
}
