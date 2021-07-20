import type {Observable} from 'rxjs';
import {EMPTY, BehaviorSubject, Subject, combineLatest, from, of} from 'rxjs';
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
    withLatestFrom,
} from 'rxjs/operators';
import Player from 'types/Player';
import {exists, Logger} from 'utils';
import {observeIsLoggedIn} from './appleAuth';

const logger = new Logger('MusicKitPlayer');

const ERR_NOT_CONNECTED = 'Apple Music player not connected.';

export class MusicKitPlayer implements Player<string> {
    private player?: MusicKit.MusicKitInstance;
    private readonly paused$ = new BehaviorSubject(true);
    private readonly duration$ = new Subject<number>();
    private readonly currentTime$ = new Subject<number>();
    private readonly ended$ = new Subject<void>();
    private readonly playing$ = new Subject<void>();
    private readonly error$ = new BehaviorSubject<unknown>(undefined);
    private readonly playerReady$ = new Subject<void>();
    private readonly element: HTMLElement;
    private readonly src$ = new BehaviorSubject('');
    private loadedSrc = '';
    private isLoggedIn = false;
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
                tap(() => this.error$.next(undefined)),
                switchMap(([src, isLoggedIn]) => {
                    if (isLoggedIn && src && src !== this.loadedSrc) {
                        const [, kind, id] = src.split(':');
                        return from(this.player!.setQueue({[kind]: id})).pipe(
                            mergeMap(() => {
                                this.loadedSrc = src;
                                if (this.autoplay) {
                                    return this.player!.play();
                                } else {
                                    return of(undefined);
                                }
                            }),
                            catchError((err) => {
                                this.error$.next(err);
                                return of(undefined);
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

        // TODO: Better to pass in the item instead of messing with `src`?
        this.observeDuration()
            .pipe(
                withLatestFrom(this.observeSrc()),
                tap(([duration, src]) => {
                    // ":unplayable" is appended to `src` if it's unplayable.
                    // e.g. 'apple:song:xyz:unplayable'.
                    const [, , , availability = 'playable'] = src.split(':');
                    // Unplayable items timeout after 30 seconds.
                    if (availability === 'unplayable' && duration === 30) {
                        this.error$.next(Error('Unplayable'));
                    }
                })
            )
            .subscribe(logger);

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
        return combineLatest([this.observeSrc(), this.observePaused()]).pipe(
            switchMap(([, paused]) => (paused ? EMPTY : this.error$.pipe(filter(exists))))
        );
    }

    appendTo(parentElement: HTMLElement): void {
        parentElement.appendChild(this.element);
    }

    load(src: string): void {
        this.src$.next(src);
        if (this.player && this.isLoggedIn) {
            if (this.autoplay) {
                this.paused$.next(false);
                if (src === this.loadedSrc) {
                    this.player.play().then(undefined, (err) => this.error$.next(err));
                }
            }
        } else if (this.autoplay) {
            this.error$.next(Error(ERR_NOT_CONNECTED));
        }
    }

    play(): void {
        this.paused$.next(false);
        if (this.player && this.isLoggedIn) {
            if (this.src === this.loadedSrc) {
                this.player.play().then(undefined, (err) => this.error$.next(err));
            }
        } else {
            this.error$.next(Error(ERR_NOT_CONNECTED));
        }
    }

    pause(): void {
        this.paused$.next(true);
        if (this.player?.isPlaying) {
            this.player.pause();
        }
    }

    stop(): void {
        this.paused$.next(true);
        this.player?.stop();
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

    private observePaused(): Observable<boolean> {
        return this.paused$.pipe(distinctUntilChanged());
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

    // The MusicKit typings for these callbacks are a bit lacking so they are all `any` for now.

    private readonly onPlaybackStateChange: any = ({state}: {state: MusicKit.PlaybackStates}) => {
        if (state === MusicKit.PlaybackStates.ended) {
            this.ended$.next(undefined);
        } else if (state === MusicKit.PlaybackStates.playing) {
            this.playing$.next(undefined);
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

    private readonly onPlaybackError: any = (event: any) => {
        // TODO: Generate this error somehow.
        console.log('MusicKit::onPlaybackError', event);
    };
}

export default new MusicKitPlayer(observeIsLoggedIn());
