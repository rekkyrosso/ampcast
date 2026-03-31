import {clamp} from './number';

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

export function openLoginPopup(url: string, target: string): Window | null {
    return openPopup(url, target, 600, 800);
}

export function openPopup(
    url: string,
    target: string,
    width: number,
    height: number
): Window | null {
    width = Math.min(width, screen.width);
    height = Math.min(height, screen.height);
    const left = clamp(
        0,
        screenLeft + Math.floor((window.outerWidth - width) / 2),
        screen.width - width
    );
    const top = clamp(
        0,
        screenTop + Math.floor((window.outerHeight - height) / 2),
        screen.height - height
    );
    return window.open(
        url,
        target,
        `popup,left=${left},top=${top},width=${width},height=${height}`
    );
}

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
