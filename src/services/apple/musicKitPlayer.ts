import type {Observable} from 'rxjs';
import {
    EMPTY,
    BehaviorSubject,
    Subject,
    catchError,
    distinctUntilChanged,
    filter,
    from,
    map,
    skipWhile,
    switchMap,
    take,
    tap,
} from 'rxjs';
import PlayableItem from 'types/PlayableItem';
import Player from 'types/Player';
import audio from 'services/audio';
import {Logger} from 'utils';
import {observeIsLoggedIn, refreshToken} from './appleAuth';

const logger = new Logger('MusicKitPlayer');

const ERR_NOT_CONNECTED = 'Apple Music player not connected';

export class MusicKitPlayer implements Player<PlayableItem> {
    private player?: MusicKit.MusicKitInstance;
    private readonly paused$ = new BehaviorSubject(true);
    private readonly duration$ = new Subject<number>();
    private readonly currentTime$ = new Subject<number>();
    private readonly ended$ = new Subject<void>();
    private readonly playing$ = new Subject<void>();
    private readonly error$ = new Subject<unknown>();
    private readonly playerLoaded$ = new Subject<void>();
    private readonly playerActivated$ = new BehaviorSubject(false);
    private readonly element: HTMLElement;
    private readonly src$ = new BehaviorSubject('');
    private loadedSrc = '';
    private isLoggedIn = false;
    private hasPlayed = false;
    public loop = false;
    public autoplay = false;
    #muted = true;
    #volume = 1;

    constructor(private readonly isLoggedIn$: Observable<boolean>) {
        const element = (this.element = document.createElement('div'));

        element.hidden = true;
        element.className = 'apple-video';
        element.id = 'apple-music-video-container';

        this.observeIsLoggedIn()
            .pipe(
                filter((isLoggedIn) => isLoggedIn),
                tap(() => {
                    const player = (this.player = MusicKit.getInstance());
                    const events = MusicKit.Events;

                    this.synchVolume();

                    player.addEventListener(
                        events.playbackStateDidChange,
                        this.onPlaybackStateChange
                    );
                    player.addEventListener(
                        events.playbackDurationDidChange,
                        this.onPlaybackDurationChange
                    );
                    player.addEventListener(
                        events.playbackTimeDidChange,
                        this.onPlaybackTimeChange
                    );
                    player.addEventListener(events.mediaPlaybackError, this.onPlaybackError);

                    this.playerLoaded$.next(undefined);
                }),
                take(1)
            )
            .subscribe(logger);

        this.observeReady()
            .pipe(
                switchMap(() => this.observeIsLoggedIn()),
                switchMap((isLoggedIn) => (isLoggedIn ? this.observePaused() : EMPTY)),
                switchMap((paused) => (paused ? EMPTY : this.observeSrc())),
                switchMap((src) => {
                    if (src && src !== this.loadedSrc) {
                        if (!this.canPlay(src)) {
                            this.error$.next(Error(this.getUnplayableReason(src)));
                            return EMPTY;
                        }
                        const [, type, id] = src.split(':');
                        // "(library-)?music-videos" => " musicVideo"
                        const kind = type
                            .replace('library-', '')
                            .replace(/s$/, '')
                            .replace(/-([a-z])/g, (_, char) => char.toUpperCase());
                        return from(this.player!.setQueue({[kind]: id})).pipe(
                            switchMap(() => {
                                this.loadedSrc = src;
                                if (this.autoplay) {
                                    return this.safePlay();
                                } else {
                                    return EMPTY;
                                }
                            }),
                            catchError((err) => {
                                this.loadedSrc = '';
                                this.error$.next(err);
                                return EMPTY;
                            })
                        );
                    } else {
                        return EMPTY;
                    }
                })
            )
            .subscribe(logger);

        this.observeIsLoggedIn()
            .pipe(
                skipWhile((isLoggedIn) => isLoggedIn === this.isLoggedIn),
                tap((isLoggedIn) => {
                    this.isLoggedIn = isLoggedIn;
                    if (!isLoggedIn) {
                        this.loadedSrc = '';
                        if (!this.paused || this.player?.isPlaying) {
                            this.stop();
                            this.error$.next(Error(ERR_NOT_CONNECTED));
                        }
                    }
                })
            )
            .subscribe(logger);

        this.observeError().subscribe(logger.error);

        this.observeError()
            .pipe(
                filter(() => this.player?.isAuthorized === false),
                switchMap(() => refreshToken()),
                catchError(() => EMPTY)
            )
            .subscribe(logger);
    }

    get hidden(): boolean {
        return this.element.hidden;
    }

    set hidden(hidden: boolean) {
        this.element.hidden = hidden;
    }

    get muted(): boolean {
        return this.#muted;
    }

    set muted(muted: boolean) {
        this.#muted = muted;
        this.synchVolume();
    }

    get volume(): number {
        return this.#volume;
    }

    set volume(volume: number) {
        this.#volume = volume;
        this.synchVolume();
    }

    observeCurrentTime(): Observable<number> {
        return this.currentTime$.pipe(distinctUntilChanged());
    }

    observeDuration(): Observable<number> {
        return this.duration$.pipe(distinctUntilChanged());
    }

    observePlaying(): Observable<void> {
        return this.playing$;
    }

    observeEnded(): Observable<void> {
        return this.ended$;
    }

    observeError(): Observable<unknown> {
        return this.error$;
    }

    appendTo(parentElement: HTMLElement): void {
        parentElement.appendChild(this.element);
    }

    load({src}: PlayableItem): void {
        logger.log('load', {src});
        if (this.autoplay) {
            this.playerActivated$.next(true);
        }
        this.src$.next(src);
        this.synchVolume();
        if (this.autoplay) {
            this.paused$.next(false);
        }
        if (this.player && this.isLoggedIn) {
            if (this.autoplay) {
                if (src === this.loadedSrc) {
                    this.safePlay();
                } else if (!this.canPlay(src)) {
                    this.error$.next(Error(this.getUnplayableReason(src)));
                }
            }
        } else if (this.autoplay) {
            this.error$.next(Error(ERR_NOT_CONNECTED));
        }
    }

    play(): void {
        logger.log('play');
        this.playerActivated$.next(true);
        this.paused$.next(false);
        if (this.player && this.isLoggedIn) {
            if (this.src === this.loadedSrc) {
                this.safePlay();
            } else if (!this.canPlay(this.src)) {
                this.error$.next(Error(this.getUnplayableReason(this.src)));
            }
        } else if (!this.isLoggedIn) {
            this.error$.next(Error(ERR_NOT_CONNECTED));
        }
    }

    pause(): void {
        logger.log('pause');
        this.paused$.next(true);
        if (this.player?.isPlaying) {
            this.player.pause();
        }
    }

    stop(): void {
        logger.log('stop');
        this.paused$.next(true);
        if (this.hasPlayed) {
            this.player!.stop();
        }
    }

    seek(time: number): void {
        this.player?.seekToTime(time);
    }

    resize(width: number, height: number): void {
        this.element.style.width = `${width}px`;
        this.element.style.height = `${height}px`;
    }

    private get paused(): boolean {
        return this.paused$.getValue();
    }

    private get src(): string {
        return this.src$.getValue();
    }

    private observeIsLoggedIn(): Observable<boolean> {
        return this.isLoggedIn$;
    }

    private observePaused(): Observable<boolean> {
        return this.paused$.pipe(distinctUntilChanged());
    }

    private observeReady(): Observable<void> {
        return this.playerLoaded$.pipe(
            switchMap(() => this.playerActivated$),
            filter((activated) => activated),
            map(() => undefined),
            take(1)
        );
    }

    private observeSrc(): Observable<string> {
        return this.src$.pipe(distinctUntilChanged());
    }

    private canPlay(src: string): boolean {
        return !this.getUnplayableReason(src);
    }

    private getUnplayableReason(src: string): string {
        const [, type] = src.split(':');
        if (/video/i.test(type) && this.player?.version.startsWith('1')) {
            return 'Video playback not supported';
        } else {
            return '';
        }
    }

    private async safePlay(): Promise<void> {
        try {
            if (this.src && this.src === this.loadedSrc && this.player?.isPlaying === false) {
                await this.player.play();
                if (!this.hasPlayed) {
                    this.hasPlayed = true;
                    if (this.player.isPlaying) {
                        this.playing$.next(undefined);
                    }
                }
            }
        } catch (err) {
            this.error$.next(err);
        }
    }

    private synchVolume(): void {
        if (this.player) {
            const [, type] = this.src.split(':');
            this.player.volume =
                // Audio volume is handled by a `GainNode`.
                !audio.streamingSupported || /video/i.test(type)
                    ? this.muted
                        ? 0
                        : this.volume
                    : 1;
        }
    }

    // The MusicKit typings for these callbacks are a bit lacking so they are all `any` for now.

    private readonly onPlaybackStateChange: any = ({state}: {state: MusicKit.PlaybackStates}) => {
        switch (state) {
            case MusicKit.PlaybackStates.playing: {
                const [, , id] = this.src.split(':');
                const nowPlayingItem = this.player!.nowPlayingItem;
                if (nowPlayingItem?.isPlayable === false && nowPlayingItem?.id === id) {
                    // Apple Music plays silence for unplayable tracks.
                    this.error$.next(Error('Unplayable'));
                    this.stop();
                } else if (this.paused) {
                    this.pause();
                } else if (this.hasPlayed) {
                    this.playing$.next(undefined);
                }
                break;
            }
            case MusicKit.PlaybackStates.ended:
                this.ended$.next(undefined);
                break;
        }
    };

    private readonly onPlaybackDurationChange: any = ({duration}: {duration: number}) => {
        this.duration$.next(duration);
    };

    private readonly onPlaybackTimeChange: any = ({
        currentPlaybackTime,
    }: {
        currentPlaybackTime: number;
    }) => {
        this.currentTime$.next(currentPlaybackTime);
    };

    private readonly onPlaybackError: any = (err: any) => {
        this.error$.next(err);
    };
}

export default new MusicKitPlayer(observeIsLoggedIn());
