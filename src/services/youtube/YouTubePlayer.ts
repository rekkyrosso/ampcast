import type {Observable} from 'rxjs';
import {
    Subject,
    BehaviorSubject,
    catchError,
    combineLatest,
    distinctUntilChanged,
    filter,
    from,
    map,
    mergeMap,
    of,
    skip,
    skipWhile,
    switchMap,
    take,
    takeUntil,
    tap,
    timer,
} from 'rxjs';
import YouTubeFactory from 'youtube-player';
import getYouTubeID from 'get-youtube-id';
import Player from 'types/Player';
import {Logger} from 'utils';
import {getYouTubeVideoInfo} from './youtube';

interface LoadError {
    readonly src: string;
    readonly error: unknown;
}

interface Size {
    readonly width: number;
    readonly height: number;
}

const compareSize = (a: Size, b: Size) => a.width === b.width && a.height === b.height;

const defaultAspectRatio = 16 / 9;

const playerVars: YT.PlayerVars = {
    autohide: 1,
    autoplay: 0,
    controls: 0,
    disablekb: 1,
    enablejsapi: 1,
    fs: 0,
    iv_load_policy: 3,
    modestbranding: 1,
    rel: 0,
    showinfo: 0,
};

// This enum doesn't seem importable. So duplicating here.
export const enum PlayerState {
    UNSTARTED = -1,
    ENDED = 0,
    PLAYING = 1,
    PAUSED = 2,
    BUFFERING = 3,
    CUED = 5,
}

export default class YouTubePlayer implements Player<string> {
    protected readonly logger: Logger;
    protected readonly player: YT.Player | null = null;
    private readonly src$ = new BehaviorSubject('');
    private readonly size$ = new BehaviorSubject<Size>({width: 0, height: 0});
    private readonly error$ = new Subject<unknown>();
    private readonly ready$ = new Subject<void>();
    private readonly state$ = new Subject<PlayerState>();
    private readonly videoId$ = new BehaviorSubject('');
    private readonly element: HTMLElement;
    private readonly targetId: string;
    private loadError?: LoadError;
    #muted = true;
    #volume = 1;
    autoplay = false;
    loop = false;

    constructor(id: string) {
        const element = (this.element = document.createElement('div'));
        const wrapper = document.createElement('div');
        const target = document.createElement('div');
        const logger = (this.logger = new Logger(`YouTubePlayer/${id}`));

        this.targetId = `youtube-iframe-${id}`;

        element.hidden = true;
        element.className = 'youtube-video';
        wrapper.className = 'youtube-video-wrapper';
        target.id = this.targetId;
        wrapper.append(target);
        element.append(wrapper);

        this.observeReady()
            .pipe(
                mergeMap(() => this.observeSrc()),
                skipWhile((src) => !src),
                tap((src) => {
                    const player = this.player!;
                    const [, type, id, offset = '0'] = src.split(':');
                    const startAt = Number(offset) || 0;
                    if (id) {
                        if (type === 'playlist') {
                            const args: YT.IPlaylistSettings = {
                                list: id,
                                listType: type,
                                index: startAt,
                            };
                            if (this.autoplay) {
                                player.loadPlaylist(args);
                            } else {
                                player.cuePlaylist(args);
                            }
                        } else {
                            if (this.autoplay) {
                                player.loadVideoById(id, startAt);
                            } else {
                                player.cueVideoById(id, startAt);
                            }
                        }
                        this.loadError = undefined;
                    } else {
                        player.stopVideo();
                    }
                })
            )
            .subscribe(logger);

        this.observeReady()
            .pipe(
                mergeMap(() => this.observeVideoSize()),
                tap(({width, height}) => this.player!.setSize(width, height))
            )
            .subscribe(logger);

        this.observeState()
            .pipe(
                filter((state) => state === PlayerState.ENDED && this.loop),
                tap(() => this.player!.seekTo(0, true))
            )
            .subscribe(logger);

        this.observeState()
            .pipe(
                filter((state) => state === PlayerState.PLAYING),
                tap(() => (this.element.style.visibility = ''))
            )
            .subscribe(logger);

        this.observeState()
            .pipe(
                map(() => this.getVideoId(this.player?.getVideoUrl() || '')),
                tap((videoId) => this.videoId$.next(videoId))
            )
            .subscribe(logger);

        this.observeError().subscribe(logger.error);
    }

    get hidden(): boolean {
        return this.element.hidden;
    }

    set hidden(hidden: boolean) {
        this.element.hidden = hidden;
        if (hidden) {
            this.element.style.visibility = 'hidden';
        }
    }

    get muted(): boolean {
        return this.#muted;
    }

    set muted(muted: boolean) {
        if (this.#muted !== muted) {
            this.#muted = muted;
            if (this.player) {
                if (muted) {
                    this.player.mute();
                } else if (this.volume !== 0) {
                    this.player.unMute();
                }
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
                this.player.setVolume(volume * 100);
                if (volume === 0) {
                    this.player.mute();
                } else if (!this.muted) {
                    this.player.unMute();
                }
            }
        }
    }

    observeCurrentTime(): Observable<number> {
        return this.observeState().pipe(
            switchMap((state) =>
                state === PlayerState.PLAYING
                    ? timer(
                          250 - (Math.round(this.player!.getCurrentTime() * 1000) % 250),
                          250
                      ).pipe(
                          map(() => this.player!.getCurrentTime()),
                          takeUntil(this.observeState())
                      )
                    : of(this.player?.getCurrentTime() || 0)
            )
        );
    }

    observeDuration(): Observable<number> {
        return this.observeState().pipe(
            map(() => this.player?.getDuration() || 0),
            filter((duration) => duration !== 0),
            distinctUntilChanged()
        );
    }

    observeEnded(): Observable<void> {
        return this.observeState().pipe(
            filter((state) => state === PlayerState.ENDED && !this.loop),
            map(() => undefined)
        );
    }

    observeError(): Observable<unknown> {
        return this.error$;
    }

    observePlaying(): Observable<void> {
        return this.observeState().pipe(
            filter((state) => state === PlayerState.PLAYING),
            map(() => undefined)
        );
    }

    observeVideoId(): Observable<string> {
        return this.videoId$.pipe(distinctUntilChanged());
    }

    appendTo(parentElement: HTMLElement): void {
        parentElement.appendChild(this.element);
        this.createPlayer();
    }

    load(src: string): void {
        this.logger.log('load', {src});
        if (!this.player) {
            this.createPlayer();
        }
        if (this.autoplay && this.player && src === this.src) {
            this.player.playVideo();
        } else {
            this.src$.next(src);
        }
    }

    play(): void {
        this.logger.log('play');
        if (this.player) {
            if (this.src === this.loadError?.src) {
                this.error$.next(this.loadError.error);
            } else {
                this.player.playVideo();
            }
        } else {
            this.error$.next(Error('YouTube player not loaded'));
        }
    }

    pause(): void {
        this.logger.log('pause');
        this.player?.pauseVideo();
    }

    stop(): void {
        this.logger.log('stop');
        this.player?.stopVideo();
    }

    seek(time: number): void {
        this.player?.seekTo(time, true);
    }

    resize(width: number, height: number): void {
        this.size$.next({width, height});
    }

    destroy(): void {
        this.player?.destroy();
        this.element.remove();
    }

    protected get src(): string {
        return this.src$.getValue();
    }

    protected observeAspectRatio(): Observable<number> {
        return this.observeVideoId().pipe(
            switchMap((videoId) =>
                videoId ? this.getAspectRatio(videoId) : of(defaultAspectRatio)
            ),
            distinctUntilChanged()
        );
    }

    protected observeReady(): Observable<void> {
        return this.ready$.pipe(take(1));
    }

    protected observeSize(): Observable<Size> {
        return this.size$.pipe(
            distinctUntilChanged(compareSize),
            filter(({width, height}) => width * height > 0)
        );
    }

    protected observeSrc(): Observable<string> {
        return this.src$.pipe(distinctUntilChanged());
    }

    protected observeState(): Observable<PlayerState> {
        return this.state$;
    }

    protected observeVideoSize(): Observable<Size> {
        return combineLatest([this.observeSize(), this.observeAspectRatio()]).pipe(
            map(([{width, height}, aspectRatio]) => {
                const newHeight = Math.max(Math.round(width / aspectRatio), height);
                const newWidth = Math.max(Math.round(newHeight * aspectRatio), width);
                return {width: newWidth, height: newHeight};
            }),
            distinctUntilChanged(compareSize)
        );
    }

    private createPlayer(): void {
        if (!this.player && this.element.isConnected) {
            const youtube = YouTubeFactory(this.targetId, {playerVars} as any);

            youtube.on('ready', ({target}: any) => {
                (this as any).player = target;

                target.setVolume(this.volume * 100);

                if (this.muted || this.volume === 0) {
                    target.mute();
                }

                this.ready$.next(undefined);
            });

            youtube.on('stateChange', ({data: state}: {data: PlayerState}) => {
                this.state$.next(state);
            });

            youtube.on('error', (error) => {
                this.loadError = {src: this.src, error};
                this.error$.next(error);
            });
        }
    }

    private getAspectRatio(videoId: string): Observable<number> {
        return from(getYouTubeVideoInfo(videoId)).pipe(
            takeUntil(timer(3000)),
            takeUntil(this.observeVideoId().pipe(skip(1))),
            map(({aspectRatio}) => aspectRatio || defaultAspectRatio),
            catchError((error) => {
                this.logger.log(
                    `Could not obtain oembed info (videoId=${videoId}): ${error.message}`
                );
                this.loadError = {src: this.src, error};
                this.error$.next(error);
                return of(defaultAspectRatio);
            })
        );
    }

    protected getPlayerState(): PlayerState {
        if (this.player) {
            return this.player.getPlayerState() as unknown as PlayerState;
        } else {
            return PlayerState.UNSTARTED;
        }
    }

    protected getVideoId(src: string): string {
        if (src.startsWith('youtube:video')) {
            const [, , videoId] = src.split(':');
            return videoId;
        } else {
            return getYouTubeID(src) || '';
        }
    }
}
