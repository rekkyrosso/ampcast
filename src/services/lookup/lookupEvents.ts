import {delay, Observable, Subject} from 'rxjs';
import MediaItem from 'types/MediaItem';
import {uniq} from 'utils';

export interface LookupEvent {
    item: MediaItem;
    found: MediaItem;
    bestOf: MediaItem;
}

const lookupEvent$ = new Subject<LookupEvent>();

export function observeLookupEvents(): Observable<LookupEvent> {
    return lookupEvent$.pipe(delay(1));
}

export function dispatchLookupEvent(item: MediaItem, found: MediaItem): void {
    lookupEvent$.next({item, found, bestOf: bestOf(found, item)});
}

function bestOf<T extends object>(a: T, b: T): T {
    const keys = uniq(Object.keys(a).concat(Object.keys(b))) as (keyof T)[];
    return keys.reduce<T>((result: T, key: keyof T) => {
        if (a[key] !== undefined) {
            result[key] = a[key];
        } else if (b[key] !== undefined) {
            result[key] = b[key];
        }
        return result;
    }, {} as unknown as T);
}
