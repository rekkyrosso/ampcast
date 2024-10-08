import DRMKeySystem from 'types/DRMKeySystem';
import DRMType from 'types/DRMType';
import MediaItem from 'types/MediaItem';
import UserData from 'types/UserData';
import browser from './browser';

const userDataKeys: (keyof UserData | 'lookupStatus')[] = [
    'rating',
    'globalRating',
    'playCount',
    'globalPlayCount',
    'inLibrary',
    'lookupStatus',
];

export function removeUserData<T extends Partial<MediaItem>>(item: T): Subtract<T, UserData> {
    const keys = Object.keys(item) as (keyof T)[];
    return keys.reduce((result, key) => {
        if (item[key] !== undefined && !userDataKeys.includes(key as any)) {
            (result as any)[key] = item[key];
        }
        return result;
    }, {} as unknown as Subtract<T, UserData>);
}

export function stringContainsMusic(text: string): boolean {
    return /m[uú][sz](i|ie)[ckq]/i.test(text);
}

const defaultDrm: DRMType =
    browser.os === 'Mac OS' || browser.os === 'iOS' ? 'fairplay' : 'widevine';
let supportedDrm: DRMType | '' = '';

export const drmKeySystems: Record<DRMType, DRMKeySystem> = {
    widevine: 'com.widevine.alpha',
    fairplay: 'com.apple.fairplay',
    playready: 'com.microsoft.playready',
};

export async function getSupportedDrm(): Promise<DRMType> {
    if (!supportedDrm) {
        const keySystems = Object.entries(drmKeySystems);
        for (const [key, keySystem] of keySystems) {
            try {
                const robustness = key === 'widevine' ? {robustness: 'SW_SECURE_CRYPTO'} : {};
                const config: MediaKeySystemConfiguration = {
                    initDataTypes: ['cenc'],
                    audioCapabilities: [
                        {contentType: 'audio/mp4;codecs="mp4a.40.2"', ...robustness},
                    ],
                    videoCapabilities: [
                        {contentType: 'video/mp4;codecs="avc1.42E01E"', ...robustness},
                    ],
                };
                await navigator.requestMediaKeySystemAccess(keySystem, [config]);
                supportedDrm = key as DRMType;
                break;
            } catch {
                // ignore
            }
        }
        if (!supportedDrm) {
            supportedDrm = defaultDrm;
        }
    }
    return supportedDrm;
}

const audio = document.createElement('audio');
const video = document.createElement('video');

export function canPlayType(type: 'audio' | 'video', contentType: string): boolean {
    const element = type === 'video' ? video : audio;
    return !!element.canPlayType(contentType).replace('no', '');
}

export function canPlayAudio(src: string): Promise<boolean> {
    return canPlayMedia('audio', src);
}

export function canPlayVideo(src: string): Promise<boolean> {
    return canPlayMedia('video', src);
}

export function canPlayMedia(type: 'audio' | 'video', src: string): Promise<boolean> {
    return new Promise((resolve) => {
        const media = document.createElement(type);
        const resolveAs = (result: boolean) => () => {
            media.removeAttribute('src');
            clearTimeout(timerId);
            resolve(result);
        };
        const resolveFalse = resolveAs(false);
        const resolveTrue = resolveAs(true);
        const timerId = setTimeout(resolveTrue, 1000);
        try {
            media.muted = true;
            media.crossOrigin = 'anonymous';
            media.onerror = resolveFalse;
            media.oncanplay = resolveTrue;
            media.onplaying = resolveTrue;
            media.ontimeupdate = resolveTrue;
            media.setAttribute('src', src);
            media.play().then(undefined, resolveFalse);
        } catch {
            resolveFalse();
        }
    });
}
