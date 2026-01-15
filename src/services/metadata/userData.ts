import {ListenData} from 'types/Listen';
import MediaItem from 'types/MediaItem';
import PlaylistItem from 'types/PlaylistItem';
import UserData from 'types/UserData';

type TransientData = Pick<PlaylistItem, 'lookupStatus' | 'startTime' | 'playlistItemId' | 'nanoId'>;

const userDataKeys: (keyof UserData | keyof ListenData | keyof TransientData)[] = [
    'rating',
    'globalLikes',
    'globalRating',
    'playCount',
    'globalPlayCount',
    'inLibrary',
    'isPinned',
    'lastfmScrobbledAt',
    'listenbrainzScrobbledAt',
    'sessionId',
    'lookupStatus',
    'startTime',
    'playlistItemId',
    'nanoId',
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
