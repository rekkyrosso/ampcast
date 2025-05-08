import {Subject, distinctUntilChanged, map, Observable, tap} from 'rxjs';
import {nanoid} from 'nanoid';
import LinearType from 'types/LinearType';
import PlaylistItem from 'types/PlaylistItem';
import {Logger} from 'utils';
import musicKitPlayer from './musicKitPlayer';
import musicKitUtils from './musicKitUtils';

const logger = new Logger('apple/nowPlaying');

const nowPlaying$ = new Subject<PlaylistItem | null>();

musicKitPlayer
    .observeNowPlaying()
    .pipe(
        map((item) =>
            item
                ? isTimedMetadata(item)
                    ? createFromTimedMetadata(item)
                    : createFromMediaItem(item)
                : null
        ),
        distinctUntilChanged((a, b) => a?.src === b?.src),
        tap(nowPlaying$)
    )
    .subscribe(logger);

export function observeNowPlaying(): Observable<PlaylistItem | null> {
    return nowPlaying$;
}

function createFromMediaItem(item: MusicKit.MediaItem): PlaylistItem | null {
    if (item.id === item.container?.id) {
        return null;
    } else {
        return {
            ...musicKitUtils.createMediaItem(item),
            src: `apple:songs:${item.id}`,
            id: nanoid(),
            linearType: LinearType.MusicTrack,
            stationName: item.container?.attributes?.name,
        };
    }
}

function createFromTimedMetadata(data: MusicKit.TimedMetadata): PlaylistItem {
    return {
        ...musicKitUtils.createFromTimedMetadata(data, musicKitPlayer.nowPlayingItem),
        id: nanoid(),
    };
}

function isTimedMetadata(
    item: MusicKit.MediaItem | MusicKit.TimedMetadata
): item is MusicKit.TimedMetadata {
    return 'blob' in item && 'storefrontAdamIds' in item;
}
