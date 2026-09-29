import type {Observable} from 'rxjs';
import {Subject, filter, map, mergeMap} from 'rxjs';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';

export interface MetadataChange<T extends MediaObject> {
    readonly match: (object: MediaObject) => boolean;
    readonly values: Partial<T>;
}

const changes$ = new Subject<readonly MetadataChange<any>[]>();

export function dispatchMetadataChanges<T extends MediaObject>(change: MetadataChange<T>): void;
export function dispatchMetadataChanges<T extends MediaObject>(
    changes: readonly MetadataChange<T>[]
): void;
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

const playlistEdited$ = new Subject<string>();

export function dispatchPlaylistEdited(src: string): void {
    playlistEdited$.next(src);
}

export function observePlaylistEdited(): Observable<string> {
    return playlistEdited$;
}

const playlistItemsChange$ = new Subject<PlaylistItemsChange>();

export function dispatchPlaylistItemsChange(
    type: PlaylistItemsChange['type'],
    src: string,
    items: readonly MediaItem[]
): void {
    playlistItemsChange$.next({type, src, items});
}

export function observePlaylistItemsChange(src: string): Observable<PlaylistItemsChange> {
    return playlistItemsChange$.pipe(filter((change) => change.src === src));
}

export function observePlaylistAdditions(src: string): Observable<readonly MediaItem[]> {
    return observePlaylistItemsChange(src).pipe(
        filter(({type}) => type === 'added'),
        map(({items}) => items)
    );
}
