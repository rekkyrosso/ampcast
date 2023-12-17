import type {Observable} from 'rxjs';
import {
    BehaviorSubject,
    distinctUntilChanged,
    filter,
    map,
    switchMap,
    take,
    takeUntil,
    throttleTime,
} from 'rxjs';
import PlaybackState from 'types/PlaybackState';
import Playback from 'types/Playback';
import {observeCurrentItem} from 'services/playlist';

export const defaultPlaybackState: PlaybackState = {
    currentItem: null,
    currentTime: 0,
    startedAt: 0,
    endedAt: 0,
    duration: 0,
    paused: true,
};

const playbackReady$ = new BehaviorSubject(false);
const playbackState$ = new BehaviorSubject<PlaybackState>(defaultPlaybackState);

export function observePlaybackReady(): Observable<void> {
    return playbackReady$.pipe(
        filter((ready) => ready),
        take(1),
        map(() => undefined)
    );
}

export function observePlaybackState(): Observable<PlaybackState> {
    return playbackState$;
}

export function observePlaybackStart(): Observable<PlaybackState> {
    return observePlaybackState().pipe(
        filter((state) => state.startedAt !== 0),
        distinctUntilChanged((a, b) => a.startedAt === b.startedAt)
    );
}

export function observePlaybackEnd(): Observable<PlaybackState> {
    return observePlaybackState().pipe(
        filter((state) => state.endedAt !== 0),
        distinctUntilChanged((a, b) => a.endedAt === b.endedAt)
    );
}

export function observePlaybackProgress(interval = 10_000): Observable<PlaybackState> {
    return observePlaybackStart().pipe(
        switchMap(() =>
            observePlaybackState().pipe(
                throttleTime(interval, undefined, {trailing: true}),
                takeUntil(observePlaybackEnd())
            )
        )
    );
}

export function observeCurrentTime(): Observable<number> {
    return observePlaybackState().pipe(
        map((state) => state.currentTime),
        distinctUntilChanged()
    );
}

export function observeDuration(): Observable<number> {
    return observePlaybackState().pipe(
        map((state) => state.duration),
        distinctUntilChanged()
    );
}

export function observePaused(): Observable<boolean> {
    return observePlaybackState().pipe(
        map((state) => state.paused),
        distinctUntilChanged()
    );
}

function getCurrentTime(): number {
    return playbackState$.getValue().currentTime;
}

function setCurrentTime(currentTime: number): void {
    const state = playbackState$.getValue();
    currentTime = Math.max(
        Math.min(Math.floor(isFinite(currentTime) ? currentTime : 0), state.duration),
        0
    );
    if (currentTime !== state.currentTime) {
        playbackState$.next({...state, currentTime});
    }
}

function getDuration(): number {
    return playbackState$.getValue().duration;
}

function setDuration(duration: number): void {
    const state = playbackState$.getValue();
    duration = Math.max(Math.floor(isFinite(duration) ? duration : 0), 0);
    if (duration !== state.duration) {
        const currentTime = Math.min(state.currentTime, duration);
        playbackState$.next({...state, duration, currentTime});
    }
}

function play(): void {
    const state = playbackState$.getValue();
    if (state.currentItem && state.paused) {
        playbackState$.next({...state, paused: false});
    }
}

function pause(): void {
    const state = playbackState$.getValue();
    if (!state.paused) {
        playbackState$.next({...state, paused: true});
    }
}

function ready(): void {
    playbackReady$.next(true);
}

function stop(): void {
    const state = playbackState$.getValue();
    if (
        !state.paused ||
        state.currentTime !== 0 ||
        (state.startedAt !== 0 && state.endedAt === 0)
    ) {
        const endedState = {
            ...state,
            paused: true,
            currentTime: 0,
            endedAt: state.endedAt || (state.startedAt ? Date.now() : 0),
        };
        playbackState$.next(endedState);
        if (state.startedAt) {
            playbackState$.next({...endedState, startedAt: 0, endedAt: 0});
        }
    }
}

function started(): void {
    const state = playbackState$.getValue();
    if (!state.startedAt) {
        playbackState$.next({...state, startedAt: Date.now()});
    }
}

function ended(): void {
    const state = playbackState$.getValue();
    if (state.startedAt) {
        if (!state.endedAt) {
            playbackState$.next({...state, endedAt: Date.now()});
        }
        playbackState$.next({...state, startedAt: 0, endedAt: 0});
    }
}

observeCurrentItem().subscribe((currentItem) => {
    const state = playbackState$.getValue();
    if (currentItem?.id === state.currentItem?.id) {
        playbackState$.next({...state, currentItem});
    } else {
        ended();
        playbackState$.next({
            ...state,
            currentItem,
            currentTime: 0,
            duration: currentItem?.duration || 0,
            startedAt: 0,
            endedAt: 0,
        });
    }
});

const playback: Playback = {
    get paused(): boolean {
        return playbackState$.getValue().paused;
    },
    observePlaybackReady,
    observePlaybackState,
    observePlaybackStart,
    observePlaybackEnd,
    observePlaybackProgress,
    observeCurrentTime,
    observeDuration,
    observePaused,
    getCurrentTime,
    setCurrentTime,
    getDuration,
    setDuration,
    play,
    pause,
    ready,
    stop,
    started,
    ended,
};

export default playback;
