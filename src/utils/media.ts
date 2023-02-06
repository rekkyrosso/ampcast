import MediaItem from 'types/MediaItem';
import PlaylistItem from 'types/PlaylistItem';

const userDataKeys: (keyof PlaylistItem)[] = [
    'rating',
    'globalRating',
    'playCount',
    'globalPlayCount',
    'inLibrary',
    'lookupStatus',
];

export function removeUserData<T extends MediaItem>(item: T): MediaItem {
    const keys = Object.keys(item) as (keyof MediaItem)[];
    return keys.reduce((result, key) => {
        if (item[key] !== undefined && !userDataKeys.includes(key)) {
            (result as any)[key] = item[key];
        }
        return result;
    }, {} as unknown as MediaItem);
}
