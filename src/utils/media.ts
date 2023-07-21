import MediaItem from 'types/MediaItem';
import UserData from 'types/UserData';

type Subtract<T, V> = Pick<T, Exclude<keyof T, keyof V>>;

const userDataKeys: (keyof MediaItem | 'lookupStatus')[] = [
    'rating',
    'globalRating',
    'playCount',
    'globalPlayCount',
    'inLibrary',
    'lookupStatus',
];

export function removeUserData<T extends MediaItem>(item: T): Subtract<MediaItem, UserData> {
    const keys = Object.keys(item) as (keyof MediaItem)[];
    return keys.reduce((result, key) => {
        if (item[key] !== undefined && !userDataKeys.includes(key)) {
            (result as any)[key] = item[key];
        }
        return result;
    }, {} as unknown as Subtract<MediaItem, UserData>);
}

export function stringContainsMusic(text: string): boolean {
    return /m[uú][sz](i|ie)[ckq]/i.test(text);
}
