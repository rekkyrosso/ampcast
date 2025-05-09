import type {Observable} from 'rxjs';
import {distinctUntilChanged, map} from 'rxjs';
import {nanoid} from 'nanoid';
import LinearType from 'types/LinearType';
import PlaylistItem from 'types/PlaylistItem';
import RadioStation from 'types/RadioStation';
import musicKitPlayer from './musicKitPlayer';
import musicKitUtils from './musicKitUtils';

export function observeNowPlaying(station: RadioStation): Observable<PlaylistItem | null> {
    return musicKitPlayer.observeNowPlaying(station.src).pipe(
        map((item) =>
            item
                ? isTimedMetadata(item)
                    ? createFromTimedMetadata(item, station)
                    : createFromMediaItem(item, station)
                : null
        ),
        distinctUntilChanged((a, b) => a?.src === b?.src)
    );
}

function createFromMediaItem(item: MusicKit.MediaItem, station: RadioStation): PlaylistItem | null {
    if (item.id === item.container?.id) {
        return null;
    } else {
        return {
            ...musicKitUtils.createMediaItem(item),
            src: `apple:songs:${item.id}`,
            id: nanoid(),
            linearType: LinearType.MusicTrack,
            stationName: station.title,
        };
    }
}

function createFromTimedMetadata(
    metadata: MusicKit.TimedMetadata,
    station: RadioStation
): PlaylistItem {
    return {
        ...musicKitUtils.createFromTimedMetadata(metadata, station),
        id: nanoid(),
    };
}

function isTimedMetadata(
    item: MusicKit.MediaItem | MusicKit.TimedMetadata
): item is MusicKit.TimedMetadata {
    return 'blob' in item && 'storefrontAdamIds' in item;
}
