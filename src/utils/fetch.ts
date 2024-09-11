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

export async function getContentType(url: string): Promise<string> {
    const response = await fetch(url, {method: 'HEAD'});
    return response.headers.get('Content-Type') || '';
}
