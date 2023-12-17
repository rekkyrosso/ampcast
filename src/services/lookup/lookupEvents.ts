import type {Observable} from 'rxjs';
import {Subject} from 'rxjs';
import MediaItem from 'types/MediaItem';
import PlaylistItem from 'types/PlaylistItem';
import {bestOf} from 'utils';

export interface LookupStartEvent {
    lookupItem: PlaylistItem;
}

export interface LookupEndEvent {
    lookupItem: PlaylistItem;
    foundItem: MediaItem | undefined;
}

const lookupStartEvent$ = new Subject<LookupStartEvent>();
const lookupEndEvent$ = new Subject<LookupEndEvent>();

export function observeLookupStartEvents(): Observable<LookupStartEvent> {
    return lookupStartEvent$;
}

export function observeLookupEndEvents(): Observable<LookupEndEvent> {
    return lookupEndEvent$;
}

export function dispatchLookupStartEvent(lookupItem: PlaylistItem): void {
    lookupStartEvent$.next({lookupItem});
}

export function dispatchLookupEndEvent(
    lookupItem: PlaylistItem,
    foundItem: MediaItem | undefined
): void {
    lookupEndEvent$.next({
        lookupItem,
        foundItem: foundItem ? bestOf(foundItem, lookupItem) : undefined,
    });
}
