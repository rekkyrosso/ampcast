import type {Observable} from 'rxjs';
import {EMPTY, BehaviorSubject, Subject, combineLatest, from} from 'rxjs';
import {
    catchError,
    distinctUntilChanged,
    filter,
    map,
    mergeMap,
    skipWhile,
    switchMap,
    take,
    tap,
} from 'rxjs/operators';
import Player from 'types/Player';
import {Logger} from 'utils';
import {observeIsLoggedIn} from './appleAuth';

const logger = new Logger('MusicKitPlayer');

const ERR_NOT_CONNECTED = 'Apple Music player not connected.';
const ERR_VIDEO_PLAYBACK_NOT_SUPPORTED = 'Video playback not supported.';

export class MusicKitPlayer implements Player<string> {
    private player?: MusicKit.MusicKitInstance;
    private readonly duration$ = new Subject<number>();
    private readonly currentTime$ = new Subject<number>();
    private readonly ended$ = new Subject<void>();
    private readonly playing$ = new Subject<void>();
    private readonly error$ = new Subject<unknown>();
    private readonly playerReady$ = new Subject<void>();
    private readonly playbackState$ = new BehaviorSubject<MusicKit.PlaybackStates>(0);
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

                    player.volume = this.muted ? 0 : this.volume;

                    this.playerReady$.next(undefined);
                }),
                take(1)
            )
            .subscribe(logger);

        this.observeReady()
            .pipe(
                mergeMap(() => combineLatest([this.observeSrc(), this.observeIsLoggedIn()])),
                switchMap(([src, isLoggedIn]) => {
                    if (isLoggedIn && src && src !== this.loadedSrc) {
                        if (!this.canPlay(src)) {
                            this.error$.next(Error(ERR_VIDEO_PLAYBACK_NOT_SUPPORTED));
                            return EMPTY;
                        }
                        const [, kind, id] = src.split(':');
                        return from(this.player!.setQueue({[kind]: id})).pipe(
                            mergeMap(() => {
                                this.loadedSrc = src;
                                if (this.autoplay) {
                                    return this.safePlay();
                                } else {
                                    return EMPTY;
                                }
                            }),
                            catchError((err) => {
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
            .pipe(skipWhile((isLoggedIn) => isLoggedIn === this.isLoggedIn))
            .subscribe((isLoggedIn) => {
                this.isLoggedIn = isLoggedIn;
                if (!isLoggedIn && this.player?.isPlaying) {
                    this.stop();
                    this.error$.next(Error(ERR_NOT_CONNECTED));
                }
            });

        this.observeError().subscribe(logger.error);
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
        if (this.#muted !== muted) {
            this.#muted = muted;
            if (this.player) {
                this.player.volume = muted ? 0 : this.volume;
            }
        }
    }

    get volume(): number {
        return this.#volume;
    }

    set volume(volume: number) {
        if (this.#volume !== volume) {
            this.#volume = volume;
            if (this.player) {
                this.player.volume = this.muted ? 0 : volume;
            }
        }
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

    load(src: string): void {
        logger.log('load');
        this.src$.next(src);
        if (this.player && this.isLoggedIn) {
            if (this.autoplay) {
                if (src === this.loadedSrc) {
                    this.safePlay();
                } else if (!this.canPlay(src)) {
                    this.error$.next(Error(ERR_VIDEO_PLAYBACK_NOT_SUPPORTED));
                }
            }
        } else if (this.autoplay) {
            this.error$.next(Error(ERR_NOT_CONNECTED));
        }
    }

    play(): void {
        logger.log('play');
        if (this.player && this.isLoggedIn) {
            if (this.src === this.loadedSrc) {
                this.safePlay();
            } else if (!this.canPlay(this.src)) {
                this.error$.next(Error(ERR_VIDEO_PLAYBACK_NOT_SUPPORTED));
            }
        } else {
            this.error$.next(Error(ERR_NOT_CONNECTED));
        }
    }

    pause(): void {
        logger.log('pause');
        if (this.player?.isPlaying) {
            this.player.pause();
        }
    }

    stop(): void {
        logger.log('stop');
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

    private get src(): string {
        return this.src$.getValue();
    }

    private observeIsLoggedIn(): Observable<boolean> {
        return this.isLoggedIn$;
    }

    private observeReady(): Observable<void> {
        return this.playerReady$.pipe(
            map(() => undefined),
            take(1)
        );
    }

    private observeSrc(): Observable<string> {
        return this.src$.pipe(distinctUntilChanged());
    }

    private canPlay(src: string): boolean {
        return this.player?.version.startsWith('1') ? !/musicVideo/.test(src) : true;
    }

    private safePlay(): Promise<void> {
        return this.player
            ? this.player.play().then(
                  () => {
                      this.hasPlayed = true;
                  },
                  (err) => this.error$.next(err)
              )
            : Promise.resolve();
    }

    // The MusicKit typings for these callbacks are a bit lacking so they are all `any` for now.

    private readonly onPlaybackStateChange: any = ({state}: {state: MusicKit.PlaybackStates}) => {
        this.playbackState$.next(state);
        if (state === MusicKit.PlaybackStates.ended) {
            this.ended$.next(undefined);
        } else if (state === MusicKit.PlaybackStates.playing) {
            const [, , id] = this.src.split(':');
            const nowPlayingItem = this.player!.nowPlayingItem;
            if (nowPlayingItem?.isPlayable === false && nowPlayingItem?.id === id) {
                // Apple Music plays silence for unplayable tracks.
                this.error$.next(Error('Unplayable'));
                this.player!.stop();
            } else {
                this.playing$.next(undefined);
            }
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
