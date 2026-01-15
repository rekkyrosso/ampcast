export function copyToClipboard(data: any): Promise<void> {
    if (data && typeof data === 'object') {
        data = JSON.stringify(data, undefined, 2);
    }
    return navigator.clipboard.writeText(String(data));
}

export function exists<T>(value: T): value is NonNullable<T> {
    return value != null;
}

export function isFullscreenMedia(): boolean {
    return document.fullscreenElement?.id === 'media' || isMiniPlayer;
}

export const isMiniPlayer = !!(
    location.hash === '#mini-player' &&
    window.name === sessionStorage.getItem('ampcast/session/miniPlayerId') &&
    getOpenerOrigin() === location.origin
);

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getOpenerOrigin(): string {
    try {
        return window.opener.origin;
    } catch {
        return '';
    }
}
