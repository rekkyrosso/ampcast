import type {Observable} from 'rxjs';
import {Subject} from 'rxjs';
import MediaObject from 'types/MediaObject';
import MediaObjectChange from 'types/MediaObjectChange';

const changes$ = new Subject<readonly MediaObjectChange<any>[]>();

function dispatch<T extends MediaObject>(change: MediaObjectChange<T>): void;
function dispatch<T extends MediaObject>(changes: MediaObjectChange<T>[]): void;
function dispatch<T extends MediaObject>(
    change: MediaObjectChange<T> | readonly MediaObjectChange<T>[]
): void {
    const changes: readonly MediaObjectChange<T>[] = Array.isArray(change) ? change : [change];
    changes$.next(changes);
}

function observe<T extends MediaObject>(): Observable<readonly MediaObjectChange<T>[]> {
    return changes$;
}

export default {
    dispatch,
    observe,
};
