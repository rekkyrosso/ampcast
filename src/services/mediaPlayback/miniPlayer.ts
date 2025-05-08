import type {Observable} from 'rxjs';
import {
    BehaviorSubject,
    Subject,
    concatMap,
    debounce,
    distinctUntilChanged,
    filter,
    firstValueFrom,
    fromEvent,
    of,
    race,
    skipWhile,
    tap,
    timer,
} from 'rxjs';
import {Writable} from 'type-fest';
import MediaPlayback from 'types/MediaPlayback';
import Playback from 'types/Playback';
import PlaylistItem from 'types/PlaylistItem';
import PlaybackState from 'types/PlaybackState';
import Visualizer from 'types/Visualizer';
import {Logger, isMiniPlayer} from 'utils';
import {MAX_DURATION} from 'services/constants';
import playlist from 'services/playlist';
import session from 'services/session';
import theme from 'services/theme';
import visualizerSettings from 'services/visualizer/visualizerSettings';
import defaultPlaybackState from './defaultPlaybackState';

const logger = new Logger('miniPlayer');

let miniPlayerWindow: Window | null = null;
let firstPlay = true;
let _autoplay = false;

const closed$ = new BehaviorSubject(true);
const loaded$ = new BehaviorSubject(false);

const active$ = new BehaviorSubject(false);
const observeActive = (): Observable<boolean> => active$.pipe(distinctUntilChanged());

const ended$ = new Subject<void>();
const observeEnded = (): Observable<void> => ended$;

const error$ = new Subject<unknown>();
const observeError = (): Observable<unknown> => error$;

const playing$ = new Subject<void>();
const observePlaying = (): Observable<void> => playing$;

const playbackState$ = new BehaviorSubject<PlaybackState>(defaultPlaybackState);
const observePlaybackState = (): Observable<PlaybackState> => playbackState$;

const close = (): void => {
    miniPlayerWindow?.close();
    miniPlayerWindow = null;
};

const connect = (
    mediaPlayback: MediaPlayback,
    playback: Playback,
    lockVisualizer: () => void,
    setCurrentVisualizer: (visualizer: Visualizer) => void
): void => {
    if (isMiniPlayer) {
        return;
    }
    logger.log('connect');

    fromEvent(window, 'pagehide').subscribe(() => sendCommand('close'));
    theme.observe().subscribe(() => sendCommand('refresh-theme'));
    playlist.observeCurrentItem().subscribe(setItem);

    window.addEventListener('message', (event: MessageEvent) => {
        if (event.origin !== location.origin || event.source !== miniPlayerWindow) {
            return;
        }

        const {name = '', data} = event.data || {};
        const [, eventType] = name.split('mini-player-on-');

        if (eventType !== 'playback-state-change') {
            logger.info(eventType);
        }

        switch (eventType) {
            case 'loaded': {
                loaded$.next(true);
                break;
            }

            case 'unloaded':
                loaded$.next(false);
                break;

            case 'closed':
                closed$.next(true);
                break;

            case 'playing':
                playing$.next();
                break;

            case 'ended':
                ended$.next();
                break;

            case 'error':
                error$.next(Error(data));
                break;

            case 'prev':
                mediaPlayback.prev();
                break;

            case 'next':
                mediaPlayback.next();
                break;

            case 'playback-state-change':
                playbackState$.next(data);
                break;

            case 'visualizer-change':
                if (active$.value) {
                    setCurrentVisualizer(data);
                }
                break;
        }
    });

    const handleOpen = async (): Promise<void> => {
        const currentItem = playlist.getCurrentItem();
        const state = playback.getPlaybackState();
        const isLiveStreaming =
            currentItem?.duration === MAX_DURATION ||
            currentItem?.isLivePlayback ||
            !!currentItem?.linearType;
        playback.suspend();
        if (isLiveStreaming) {
            mediaPlayback.stop();
        } else if (!state.paused) {
            mediaPlayback.pause();
        }
        firstPlay = true;

        const lockedVisualizer = visualizerSettings.lockedVisualizer;
        lockVisualizer();
        const {paused, currentTime} = state;
        transferPlayback({
            ...state,
            currentItem,
            duration: currentItem?.duration || 0,
            currentTime:
                state.currentItem?.src === currentItem?.src && !isLiveStreaming ? currentTime : 0,
        });
        const ready$ = playbackState$.pipe(
            filter(
                (state) =>
                    state.paused === paused &&
                    state.currentItem?.src === currentItem?.src &&
                    (paused
                        ? Math.abs(state.currentTime - currentTime) < 2
                        : state.currentTime - currentTime >= 0)
            )
        );
        const timeout$ = timer(2000);
        await firstValueFrom(race(ready$, timeout$));
        visualizerSettings.lockedVisualizer = lockedVisualizer;
        playback.unsuspend();
        active$.next(true);
    };

    const handleClose = async (): Promise<void> => {
        const state: Writable<PlaybackState> = playback.getPlaybackState();
        const {currentTime, playbackId, startedAt} = state;
        state.paused = true; // pause after transfer back
        playbackState$.next(state);
        playback.suspend();
        miniPlayerWindow = null;
        firstPlay = true;
        active$.next(false);
        mediaPlayback.autoplay = false; // remain paused
        const currentItem = playlist.getCurrentItem();
        if (currentItem) {
            const isLiveStreaming =
                currentItem.duration === MAX_DURATION ||
                currentItem.isLivePlayback ||
                !!currentItem.linearType;
            mediaPlayback.load({
                ...currentItem,
                startTime: isLiveStreaming ? undefined : currentTime,
            });
            const state: Writable<PlaybackState> = playback.getPlaybackState();
            state.playbackId = playbackId;
            state.startedAt = startedAt;
        }
        playbackState$.next(defaultPlaybackState);
        playback.unsuspend();
    };

    loaded$
        .pipe(
            // Allow for page refreshes.
            debounce((loaded) => (loaded ? of(0) : timer(500))),
            distinctUntilChanged(),
            tap((loaded) => closed$.next(!loaded))
        )
        .subscribe(logger);

    closed$
        .pipe(
            skipWhile((closed) => closed),
            distinctUntilChanged(),
            concatMap((closed) => (closed ? handleClose() : handleOpen()))
        )
        .subscribe(logger);
};

const focus = (): void => miniPlayerWindow?.focus();

const getPlaybackState = (): PlaybackState => playbackState$.value;

const load = (item: PlaylistItem | null): void => {
    if (!isMiniPlayer) {
        if (miniPlayerWindow) {
            logger.log('load', item?.src ?? null);
            if (_autoplay) {
                forceFocusOnFirstPlay();
            }
            sendCommand('load', safeMediaItem(item));
        }
    }
};

const loadNext = (item: PlaylistItem | null): void => {
    sendCommand('loadNext', safeMediaItem(item));
};

const lock = (): void => sendCommand('lock');

const nextVisualizer = (): void => sendCommand('next-visualizer');

const open = (): void => {
    logger.log('open');
    if (isMiniPlayer) {
        throw Error('Not allowed');
    }
    if (!miniPlayerWindow) {
        miniPlayerWindow = window.open(
            `${location.href}#mini-player`,
            session.miniPlayerId,
            'popup'
        );
    }
    miniPlayerWindow?.focus();
};

const pause = (): void => {
    logger.log('pause');
    sendCommand('pause');
};

const play = (): void => {
    logger.log('play');
    forceFocusOnFirstPlay();
    sendCommand('play');
};

const seek = (time: number): void => sendCommand('seek', time);

const stop = (): void => {
    logger.log('stop');
    sendCommand('stop');
};

const unlock = (): void => sendCommand('unlock');

const forceFocusOnFirstPlay = (): void => {
    if (firstPlay) {
        firstPlay = false;
        if (miniPlayerWindow?.document.hidden) {
            miniPlayerWindow.focus();
        }
    }
};

const setItem = (item: PlaylistItem | null): void => {
    setValue('item', safeMediaItem(item));
};

const setValue = (name: string, value?: any): void => {
    sendCommand(`set-${name}`, value);
};

const transferPlayback = (state: PlaybackState): void => {
    const currentItem = state.currentItem;
    sendCommand(
        'transfer-playback',
        currentItem ? {...state, currentItem: safeMediaItem(currentItem)} : state
    );
};

const safeMediaItem = (item: PlaylistItem | null): PlaylistItem | null => {
    if (item?.blob) {
        const {blob, ...safeItem} = item;
        item = {...safeItem, blobUrl: URL.createObjectURL(blob)};
    }
    return item;
};

const sendCommand = (command: string, data?: any): void => {
    if (miniPlayerWindow) {
        const name = `mini-player-${command}`;
        miniPlayerWindow.postMessage({name, data}, location.origin);
    }
};

const miniPlayer = {
    get active(): boolean {
        return active$.value;
    },
    get closed(): boolean {
        return closed$.value;
    },
    get currentItem(): PlaylistItem | null {
        return playbackState$.value.currentItem;
    },
    get currentTime(): number {
        return playbackState$.value.currentTime;
    },
    get duration(): number {
        return playbackState$.value.duration;
    },
    get id(): string {
        return session.miniPlayerId;
    },
    get paused(): boolean {
        return playbackState$.value.paused;
    },
    get playbackId(): string {
        return playbackState$.value.playbackId;
    },
    // No need for getters apparently.
    set autoplay(autoplay: boolean) {
        _autoplay = autoplay;
        setValue('autoplay', autoplay);
    },
    set muted(muted: boolean) {
        setValue('muted', muted);
    },
    set volume(volume: number) {
        setValue('volume', volume);
    },
    observeActive,
    observeEnded,
    observeError,
    observePlaybackState,
    observePlaying,
    close,
    connect,
    focus,
    getPlaybackState,
    load,
    loadNext,
    lock,
    nextVisualizer,
    open,
    pause,
    play,
    seek,
    stop,
    unlock,
};

export default miniPlayer;
