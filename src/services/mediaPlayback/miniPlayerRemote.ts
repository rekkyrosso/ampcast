import {filter, firstValueFrom, fromEvent, map, merge, race, takeUntil, timer} from 'rxjs';
import {Writable} from 'type-fest';
import MediaPlayback from 'types/MediaPlayback';
import PlaybackState from 'types/PlaybackState';
import PlaylistItem from 'types/PlaylistItem';
import {Logger, isMiniPlayer} from 'utils';
import {MAX_DURATION} from 'services/constants';
import {loadMediaServices} from 'services/mediaServices';
import playlist from 'services/playlist';
import theme from 'services/theme';
import {nextVisualizer, observeCurrentVisualizer} from 'services/visualizer';
import mediaPlayer from './mediaPlayer';
import playback from './playback';

const logger = new Logger('miniPlayerRemote');

const defaultTitle = `${__app_name__} mini player`;

const connect = (
    mediaPlayback: MediaPlayback,
    lockLoading: () => void,
    unlockLoading: () => void
): void => {
    if (!isMiniPlayer) {
        return;
    }
    logger.log('connect');

    document.title = defaultTitle;

    let suspended = false;

    const beforeunload$ = fromEvent(window, 'beforeunload');
    const pagehide$ = fromEvent(window, 'pagehide');
    const killed$ = merge(pagehide$, beforeunload$);

    const getTitle = ({artists: [artist] = [], title}: PlaylistItem): string => {
        return artist ? `${artist} - ${title}` : title;
    };

    const setItem = (item: PlaylistItem | null) => {
        document.title = item ? getTitle(item) : defaultTitle;
        playlist.setItems(item ? [item] : []);
    };

    const transferPlayback = async (transferredState: PlaybackState) => {
        const {currentItem, duration, currentTime, paused, playbackId, startedAt} =
            transferredState;
        const isLiveStreaming = duration === MAX_DURATION;
        suspended = true;
        await loadMediaServices();
        setItem(currentItem);
        mediaPlayback.autoplay = !paused;
        if (!currentItem) {
            mediaPlayback.load(currentItem);
        } else {
            mediaPlayback.load({
                ...currentItem,
                startTime: isLiveStreaming ? undefined : currentTime,
            });
        }
        // Mutate the playback state to use the same `playbackId`.
        let playbackState: Writable<PlaybackState> = playback.getPlaybackState();
        playbackState.playbackId = playbackId;
        const timeout$ = timer(3000).pipe(map(() => playback.getPlaybackState()));
        const playbackState$ = playback
            .observePlaybackState()
            .pipe(
                filter(
                    (state) =>
                        state.paused === paused &&
                        state.currentItem?.id === currentItem?.id &&
                        (paused
                            ? Math.abs(state.currentTime - currentTime) < 2
                            : state.currentTime - currentTime >= 0) &&
                        (startedAt ? state.startedAt > 0 : true)
                )
            );
        playbackState = await firstValueFrom(race(playbackState$, timeout$));
        if (startedAt) {
            playbackState.startedAt = startedAt;
        }
        suspended = false;
        emitEvent('playback-state-change', playbackState);
    };

    beforeunload$.subscribe(() => emitEvent('unloaded'));
    pagehide$.subscribe(() => emitEvent('closed'));

    mediaPlayer.observePlaying().subscribe(() => emitEvent('playing'));
    mediaPlayer.observeEnded().subscribe(() => emitEvent('ended'));
    mediaPlayer
        .observeError()
        .pipe(
            map((error: any) => String(error?.message || 'unknown')),
            takeUntil(killed$)
        )
        .subscribe((error) => emitEvent('error', error));

    playback
        .observePlaybackState()
        .pipe(
            filter(() => !suspended),
            takeUntil(killed$)
        )
        .subscribe((state) => emitEvent('playback-state-change', state));

    observeCurrentVisualizer()
        .pipe(
            filter(() => !suspended),
            takeUntil(killed$)
        )
        .subscribe(({providerId, name}) => emitEvent('visualizer-change', {providerId, name}));

    window.addEventListener('message', (event: MessageEvent) => {
        if (event.origin !== location.origin || event.source !== opener) {
            return;
        }

        const {name = '', data} = event.data || {};
        const [, command] = name.split('mini-player-');

        logger.log(command, command.startsWith('set-') ? data : '');

        switch (command) {
            case 'close':
                mediaPlayback.stop();
                window.close();
                break;

            case 'load':
                mediaPlayback.load(data);
                break;

            case 'loadNext':
                mediaPlayer.loadNext(data);
                break;

            case 'lock':
                lockLoading();
                break;

            case 'unlock':
                unlockLoading();
                break;

            case 'pause':
                mediaPlayback.pause();
                break;

            case 'play':
                mediaPlayback.play();
                break;

            case 'refresh-theme':
                theme.load();
                break;

            case 'seek':
                mediaPlayback.seek(data);
                break;

            case 'stop':
                mediaPlayback.stop();
                break;

            case 'next-visualizer':
                nextVisualizer('next-clicked');
                break;

            case 'set-autoplay':
                mediaPlayback.autoplay = data;
                break;

            case 'set-item':
                setItem(data);
                break;

            case 'set-muted':
                mediaPlayback.muted = data;
                break;

            case 'set-volume':
                mediaPlayback.volume = data;
                break;

            case 'transfer-playback': {
                transferPlayback(data);
                break;
            }
        }
    });

    emitEvent('loaded');
};

const prev = (): void => {
    logger.log('prev');
    emitEvent('prev');
};

const next = (): void => {
    logger.log('next');
    emitEvent('next');
};

const emitEvent = (eventType: string, data?: any): void => {
    if (opener) {
        const name = `mini-player-on-${eventType}`;
        opener.postMessage({name, data}, location.origin);
    }
};

const miniPlayerRemote = {
    connect,
    prev,
    next,
};

export default miniPlayerRemote;
