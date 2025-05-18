// From: https://github.com/whatwg/fetch/issues/905#issuecomment-1816547024
export function anySignal(signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();

    for (const signal of signals) {
        if (signal.aborted) {
            controller.abort();
            return signal;
        }

        signal.addEventListener('abort', () => controller.abort(signal.reason), {
            signal: controller.signal,
        });
    }

    return controller.signal;
}

export async function getHeaders(url: string): Promise<Headers> {
    const response = await fetch(url, {method: 'HEAD'});
    if (response.status === 400) {
        // HEAD request not allowed.
        // The response headers are probably meaningless and associated with an error page.
        return new Headers();
    }
    return response.headers;
}

export async function getContentType(url: string): Promise<string> {
    const headers = await getHeaders(url);
    return headers.get('content-type')?.toLowerCase() || '';
}
