import type {Observable} from 'rxjs';
import {Subject} from 'rxjs';
import MediaItem from 'types/MediaItem';
import {bestOf} from 'utils';

export interface LookupStartEvent {
    lookupItem: MediaItem;
}

export interface LookupEndEvent {
    lookupItem: MediaItem;
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

export function dispatchLookupStartEvent(lookupItem: MediaItem): void {
    lookupStartEvent$.next({lookupItem});
}

export function dispatchLookupEndEvent(
    lookupItem: MediaItem,
    foundItem: MediaItem | undefined
): void {
    lookupEndEvent$.next({
        lookupItem,
        foundItem: foundItem ? bestOf(foundItem, lookupItem) : undefined,
    });
}
