import type {Observable} from 'rxjs';
import {distinctUntilChanged, mergeMap, of, tap, timer} from 'rxjs';
import LinearType from 'types/LinearType';
import PlaylistItem from 'types/PlaylistItem';
import {fetchNowPlaying} from './onlineRadioBox';

export default function observeInternetRadioTrack(
    station: PlaylistItem
): Observable<PlaylistItem | null> {
    let previousTrack: PlaylistItem | null = null;
    return isInternetRadioStation(station)
        ? timer(500, 12_000).pipe(
              mergeMap(() => fetchNowPlaying(station, previousTrack)),
              distinctUntilChanged((a, b) => a?.src === b?.src),
              tap((track) => (previousTrack = track))
          )
        : of(null);
}

function isInternetRadioStation(station: PlaylistItem): boolean {
    return station?.linearType === LinearType.Station && /^https?:/.test(station.src);
}
