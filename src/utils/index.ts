import BaseMediaObject from 'types/BaseMediaObject';
import Thumbnail from 'types/Thumbnail';
import pixel from 'assets/pixel.png.base64';
import ItemType from 'types/ItemType';
export {default as LiteStorage} from './LiteStorage';
export {default as Logger} from './Logger';
export {default as browser} from './browser';

export function exists<T>(value: T): value is NonNullable<T> {
    return value != null;
}

const loadedScripts: {[src: string]: true | undefined} = {};

export async function loadScript(src: string): Promise<void> {
    if (loadedScripts[src]) {
        return;
    }
    return new Promise((resolve, reject) => {
        let script: HTMLScriptElement | null = document.querySelector(`script[src="${src}"]`);
        if (!script) {
            script = document.createElement('script');
            script.async = true;
            script.src = src;
        }
        script.addEventListener('load', () => {
            loadedScripts[src] = true;
            resolve();
        });
        script.addEventListener('error', () => reject(`Failed to load script: '${src}'`));
        if (!script.parentElement) {
            document.head.appendChild(script);
        }
    });
}

const defaultThumbnail: Thumbnail = {
    url: pixel,
    width: 1,
    height: 1,
};

export function findBestThumbnail(thumbnails: Thumbnail[] = [], maxSize = 360, aspectRatio = 1) {
    if (thumbnails.length === 0) {
        return defaultThumbnail;
    }
    thumbnails.sort((a, b) => b.width * b.height - a.width * a.height); // permanent sort
    const isNotTooBig = (thumbnail: Thumbnail) =>
        thumbnail.width <= maxSize && thumbnail.height <= maxSize;
    const [smallEnough, tooBig] = partition(thumbnails, isNotTooBig);
    if (smallEnough.length > 0) {
        smallEnough.sort((thumbnail1, thumbnail2) => {
            const aspectRatio1 = thumbnail1.width / thumbnail1.height;
            const proximity1 = Math.abs(aspectRatio1 - aspectRatio);
            const aspectRatio2 = thumbnail2.width / thumbnail2.height;
            const proximity2 = Math.abs(aspectRatio2 - aspectRatio);
            return proximity1 - proximity2;
        });
        return smallEnough[0];
    }
    return tooBig[tooBig.length - 1] || defaultThumbnail;
}

export function partition<T>(values: T[], predicate: (value: T) => boolean): [T[], T[]] {
    const trues: T[] = [];
    const falses: T[] = [];
    for (const value of values) {
        if (predicate(value)) {
            trues.push(value);
        } else {
            falses.push(value);
        }
    }
    return [trues, falses];
}

export function uniq<T>(values: readonly T[]): T[] {
    return values.filter((a, index, self) => index === self.findIndex((b) => a === b));
}

export function uniqBy<T>(values: readonly T[], key: keyof T): T[] {
    return values.filter((a, index, self) => index === self.findIndex((b) => a[key] === b[key]));
}

export function formatTime(time: number): string {
    return new Date(Math.round((time || 0) * 1000))
        .toISOString()
        .slice(11, 19) // time portion of: YYYY-MM-DDTHH:mm:ss.sssZ
        .replace(/^[0:]+(.{4,})$/, '$1'); // remove leading zeroes
}

export function preventDefault(event: Event | React.SyntheticEvent): void {
    event.preventDefault();
}

export function stopPropagation(event: Event | React.SyntheticEvent): void {
    event.stopPropagation();
}

export function createEmptyMediaObject<T extends ItemType>(itemType: T): BaseMediaObject<T> {
    return {itemType, src: '', title: ''};
}

export function getRandomValue<T>(values: readonly T[], previousValue?: T, callCount = 0): T {
    if (values.length === 1) {
        return values[0];
    }
    const index = Math.floor(Math.random() * values.length);
    const value = values[index];
    if (previousValue !== undefined && value === previousValue && callCount < 3) {
        return getRandomValue(values, previousValue, callCount++);
    }
    return value;
}
