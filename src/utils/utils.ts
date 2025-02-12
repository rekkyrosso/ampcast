import {uniq} from './array';

export function bestOf<T extends object>(a: T, b: Partial<T> = {}): T {
    const keys = uniq(Object.keys(a).concat(Object.keys(b))) as (keyof T)[];
    return keys.reduce<T>((result: T, key: keyof T) => {
        if (a[key] !== undefined) {
            result[key] = a[key];
        } else if (b[key] !== undefined) {
            result[key] = b[key]!;
        }
        return result;
    }, {} as T);
}

export function copyToClipboard(data: any): Promise<void> {
    if (data && typeof data === 'object') {
        data = JSON.stringify(data, undefined, 2);
    }
    return navigator.clipboard.writeText(String(data));
}

export function decode(value: string): string {
    try {
        if (value) {
            const values = value.split(',').map(Number);
            if (values.some(isNaN)) {
                throw Error('Invalid encoding');
            }
            return new TextDecoder().decode(Uint8Array.from(values));
        }
    } catch (err) {
        console.error(err);
    }
    return '';
}

export function exists<T>(value: T): value is NonNullable<T> {
    return value != null;
}

export function isFullscreenMedia(): boolean {
    return document.fullscreenElement?.id === 'media' || isMiniPlayer;
}

export const isMiniPlayer = !!(
    opener?.origin === location.origin &&
    window.name === sessionStorage.getItem('ampcast/session/miniPlayerId') &&
    location.hash === '#mini-player'
);

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
