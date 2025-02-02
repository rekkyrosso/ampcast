import type {Observable} from 'rxjs';
import {
    BehaviorSubject,
    distinctUntilChanged,
    filter,
    map,
    switchMap,
    takeUntil,
    throttleTime,
} from 'rxjs';
import {nanoid} from 'nanoid';
import PlaylistItem from 'types/PlaylistItem';
import Playback from 'types/Playback';
import PlaybackState from 'types/PlaybackState';
import miniPlayer from './miniPlayer';
import defaultPlaybackState from './defaultPlaybackState';

const newSession = () => ({
    startedAt: 0,
    endedAt: 0,
    playbackId: nanoid(),
});

const playbackState$ = new BehaviorSubject<PlaybackState>({
    ...defaultPlaybackState,
    ...newSession(),
});

let suspended = false;

export function observePlaybackState(): Observable<PlaybackState> {
    return miniPlayer.observeActive().pipe(
        switchMap((active) => (active ? miniPlayer.observePlaybackState() : playbackState$)),
        filter(() => !suspended)
    );
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

export function observeCurrentItem(): Observable<PlaylistItem | null> {
    return observePlaybackState().pipe(
        map((state) => state.currentItem),
        distinctUntilChanged()
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

export function getPlaybackId(): string {
    return miniPlayer.active ? miniPlayer.playbackId : playbackState$.value.playbackId;
}

export function getPlaybackState(): PlaybackState {
    return miniPlayer.active ? miniPlayer.getPlaybackState() : playbackState$.value;
}

function getCurrentItem(): PlaylistItem | null {
    return miniPlayer.active ? miniPlayer.currentItem : playbackState$.value.currentItem;
}

function setCurrentItem(currentItem: PlaylistItem | null): void {
    const state = playbackState$.value;
    if (currentItem !== state.currentItem) {
        if (currentItem?.id === state.currentItem?.id) {
            // Refresh the item, but no play states have changed.
            playbackState$.next({...state, currentItem});
        } else {
            if (state.startedAt && !state.endedAt) {
                playbackState$.next({...state, endedAt: Date.now()});
            }
            playbackState$.next({
                ...state,
                ...newSession(),
                currentItem,
                currentTime: currentItem?.startTime || 0,
                duration: currentItem?.duration || 0,
            });
        }
    }
}

function getCurrentTime(): number {
    return miniPlayer.active ? miniPlayer.currentTime : playbackState$.value.currentTime;
}

function setCurrentTime(currentTime: number): void {
    const state = playbackState$.value;
    currentTime = Math.max(Math.min(isFinite(currentTime) ? currentTime : 0, state.duration), 0);
    if (currentTime !== state.currentTime) {
        playbackState$.next({
            ...state,
            currentTime,
        });
    }
}

function getDuration(): number {
    return miniPlayer.active ? miniPlayer.duration : playbackState$.value.duration;
}

function setDuration(duration: number): void {
    const state = playbackState$.value;
    duration = Math.max(isFinite(duration) ? duration : 0, 0);
    if (duration !== state.duration) {
        const currentTime = Math.min(state.currentTime, duration);
        playbackState$.next({
            ...state,
            duration,
            currentTime,
        });
    }
}

function play(): void {
    const state = playbackState$.value;
    if (state.currentItem && state.paused) {
        playbackState$.next({
            ...state,
            paused: false,
        });
    }
}

function pause(): void {
    const state = playbackState$.value;
    if (!state.paused) {
        playbackState$.next({
            ...state,
            paused: true,
        });
    }
}

function stop(): void {
    const state = playbackState$.value;
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
            playbackState$.next({
                ...endedState,
                ...newSession(),
            });
        }
    }
}

function playing(): void {
    const state = playbackState$.value;
    if (!state.startedAt) {
        playbackState$.next({
            ...state,
            startedAt: Date.now(),
        });
    }
}

function ended(): void {
    const state = playbackState$.value;
    if (state.startedAt) {
        if (!state.endedAt) {
            playbackState$.next({...state, endedAt: Date.now()});
        }
        playbackState$.next({
            ...state,
            ...newSession(),
        });
    }
}

function suspend(): void {
    suspended = true;
}

function unsuspend(): void {
    suspended = false;
}

const playback: Playback = {
    get currentItem(): PlaylistItem | null {
        return getCurrentItem();
    },
    set currentItem(currentItem: PlaylistItem | null) {
        setCurrentItem(currentItem);
    },
    get currentTime(): number {
        return getCurrentTime();
    },
    set currentTime(currentTime: number) {
        setCurrentTime(currentTime);
    },
    get duration(): number {
        return getDuration();
    },
    set duration(duration: number) {
        setDuration(duration);
    },
    get paused(): boolean {
        return miniPlayer.active ? miniPlayer.paused : playbackState$.value.paused;
    },
    observePlaybackState,
    observePlaybackStart,
    observePlaybackEnd,
    observePlaybackProgress,
    observeCurrentItem,
    observeCurrentTime,
    observeDuration,
    observePaused,
    getPlaybackId,
    getPlaybackState,
    ended,
    play,
    playing,
    pause,
    stop,
    suspend,
    unsuspend,
};

export default playback;
