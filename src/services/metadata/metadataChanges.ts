import type {Observable} from 'rxjs';
import {Subject, filter, map, mergeMap} from 'rxjs';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MetadataChange from 'types/MetadataChange';

const changes$ = new Subject<readonly MetadataChange<any>[]>();

export function dispatchMetadataChanges<T extends MediaObject>(change: MetadataChange<T>): void;
export function dispatchMetadataChanges<T extends MediaObject>(changes: MetadataChange<T>[]): void;
export function dispatchMetadataChanges<T extends MediaObject>(
    change: MetadataChange<T> | readonly MetadataChange<T>[]
): void {
    const changes: readonly MetadataChange<T>[] = change
        ? Array.isArray(change)
            ? change
            : [change]
        : [];
    if (changes.length > 0) {
        changes$.next(changes);
    }
}

export function observeMetadataChanges<T extends MediaObject>(): Observable<
    readonly MetadataChange<T>[]
> {
    return changes$;
}

export function observeMetadataChange<T extends MediaObject>(
    object: MediaObject
): Observable<MetadataChange<T>['values']> {
    return changes$.pipe(
        mergeMap((change) => change),
        filter((change) => change.match(object)),
        map((change) => change.values)
    );
}

export interface PlaylistItemsChange {
    readonly type: 'added';
    readonly src: string;
    readonly items: readonly MediaItem[];
}

const playlistItemsChange$ = new Subject<PlaylistItemsChange>();

export function dispatchPlaylistItemsChange(
    type: PlaylistItemsChange['type'],
    src: string,
    items: readonly MediaItem[]
): void {
    playlistItemsChange$.next({type, src, items});
}

export function observePlaylistItemsChange(
    playlist?: MediaPlaylist
): Observable<PlaylistItemsChange> {
    return playlistItemsChange$.pipe(
        filter((change) => (playlist ? change.src === playlist.src : true))
    );
}

export function observePlaylistAdditions(
    playlist?: MediaPlaylist
): Observable<PlaylistItemsChange> {
    return observePlaylistItemsChange(playlist).pipe(filter(({type}) => type === 'added'));
}
