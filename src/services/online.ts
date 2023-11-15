import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged, fromEvent, map, merge} from 'rxjs';

const isOnLine$ = new BehaviorSubject(isOnLine());

export function observeIsOnLine(): Observable<boolean> {
    return isOnLine$.pipe(distinctUntilChanged());
}

export function isOnLine(): boolean {
    return navigator.onLine;
}

merge(
    fromEvent(window, 'online').pipe(map(() => true)),
    fromEvent(window, 'offline').pipe(map(() => false))
).subscribe(isOnLine$);
