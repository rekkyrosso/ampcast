import type {Observable} from 'rxjs';
import {Subject} from 'rxjs';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
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

export function observePlaylistItemsChange(): Observable<PlaylistItemsChange> {
    return playlistItemsChange$;
}
