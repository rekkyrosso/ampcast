import type {Observable} from 'rxjs';
import {Subject} from 'rxjs';
import MediaObject from 'types/MediaObject';
import MediaObjectChange from 'types/MediaObjectChange';

const changes$ = new Subject<readonly MediaObjectChange<any>[]>();

export function dispatchMediaObjectChanges<T extends MediaObject>(
    change: MediaObjectChange<T>
): void;
export function dispatchMediaObjectChanges<T extends MediaObject>(
    changes: MediaObjectChange<T>[]
): void;
export function dispatchMediaObjectChanges<T extends MediaObject>(
    change: MediaObjectChange<T> | readonly MediaObjectChange<T>[]
): void {
    const changes: readonly MediaObjectChange<T>[] = change
        ? Array.isArray(change)
            ? change
            : [change]
        : [];
    if (changes.length > 0) {
        changes$.next(changes);
    }
}

export function observeMediaObjectChanges<T extends MediaObject>(): Observable<
    readonly MediaObjectChange<T>[]
> {
    return changes$;
}
