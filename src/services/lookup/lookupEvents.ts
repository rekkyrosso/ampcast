import MediaItem from 'types/MediaItem';
import {delay, Observable, Subject} from 'rxjs';

export interface LookupEvent {
    item: MediaItem;
    found: MediaItem;
}

const lookupEvent$ = new Subject<LookupEvent>();

export function observeLookupEvents(): Observable<LookupEvent> {
    return lookupEvent$.pipe(delay(1));
}

export function dispatchLookupEvent(item: MediaItem, found: MediaItem): void {
    lookupEvent$.next({item, found});
}
