import type {Observable} from 'rxjs';
import {
    EMPTY,
    BehaviorSubject,
    Subject,
    catchError,
    combineLatest,
    distinctUntilChanged,
    filter,
    firstValueFrom,
    from,
    map,
    mergeMap,
    of,
    race,
    skip,
    switchMap,
    take,
    takeUntil,
    tap,
    timer,
} from 'rxjs';
import YouTubeFactory from 'youtube-player';
import PlayableItem from 'types/PlayableItem';
import Player from 'types/Player';
import {Logger} from 'utils';
import youtubeApi from './youtubeApi';

interface Size {
    readonly width: number;
    readonly height: number;
}

const host = 'https://www.youtube-nocookie.com';

const compareSize = (a: Size, b: Size) => a.width === b.width && a.height === b.height;

const defaultAspectRatio = 16 / 9;

const playerVars: YT.PlayerVars = {
    autohide: 1,
    autoplay: 0,
    controls: 0,
    disablekb: 1,
    enablejsapi: 1,
    origin: location.origin,
    fs: 0,
    iv_load_policy: 3,
    modestbranding: 1, // deprecated
    rel: 0,
    showinfo: 0,
};

export default class YouTubePlayer implements Player<PlayableItem> {
    static readonly host = host;
    static readonly playerVars = playerVars;
    private readonly logger: Logger;
    private readonly player: YT.Player | null = null;
    private Player: ReturnType<typeof YouTubeFactory> | null = null;
    private readonly item$ = new BehaviorSubject<PlayableItem | null>(null);
    private readonly paused$ = new BehaviorSubject(true);
    private readonly size$ = new BehaviorSubject<Size>({width: 0, height: 0});
    private readonly error$ = new Subject<unknown>();
    private readonly playerLoaded$ = new BehaviorSubject(false);
    private readonly state$ = new Subject<YT.PlayerState>();
    private readonly videoId$ = new BehaviorSubject('');
    private readonly element: HTMLElement;
    private readonly targetId: string;
    private loadedSrc = '';
    private hasWaited = false;
    autoplay = false;
    loop = false;
    #muted = true;
    #volume = 1;

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

        // Load new videos.
        this.observePaused()
            .pipe(
                switchMap((paused) => (paused ? EMPTY : this.observeItem())),
                switchMap((item) => {
                    if (item && item.src !== this.loadedSrc) {
                        return of(undefined).pipe(
                            mergeMap(() => this.createPlayer()),
                            mergeMap(() => this.loadAndPlay(item)),
                            catchError((error) => {
                                this.loadedSrc = '';
                                this.error$.next(error);
                                return EMPTY;
                            }),
                            take(1)
                        );
                    } else {
                        return EMPTY;
                    }
                })
            )
            .subscribe(this.logger);

        this.observeVideoSize()
            .pipe(
                filter(({width, height}) => width * height > 0),
                tap(({width, height}) => this.player?.setSize(width, height))
            )
            .subscribe(logger);

        this.observeState()
            .pipe(
                filter((state) => state === YT.PlayerState.ENDED && this.loop),
                tap(() => this.player?.seekTo(0, true))
            )
            .subscribe(logger);

        this.observeState()
            .pipe(
                filter((state) => state === YT.PlayerState.PLAYING),
                tap(() => (this.element.style.visibility = ''))
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
                state === YT.PlayerState.PLAYING
                    ? timer(
                          250 - (Math.round(this.player!.getCurrentTime() * 1000) % 250),
                          250
                      ).pipe(
                          map(() => this.player!.getCurrentTime()),
                          takeUntil(this.observeState())
                      )
                    : EMPTY
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
            filter((state) => state === YT.PlayerState.ENDED && !this.loop),
            map(() => undefined)
        );
    }

    observeError(): Observable<unknown> {
        return this.error$;
    }

    observePlaying(): Observable<void> {
        return this.observeState().pipe(
            filter((state) => state === YT.PlayerState.PLAYING),
            map(() => undefined)
        );
    }

    observeVideoId(): Observable<string> {
        return this.videoId$.pipe(distinctUntilChanged());
    }

    appendTo(parentElement: HTMLElement): void {
        parentElement.appendChild(this.element);
    }

    load(item: PlayableItem): void {
        this.logger.log('load', item.src);
        this.item$.next(item);
        this.paused$.next(!this.autoplay);
        if (item.src === this.loadedSrc) {
            this.player?.seekTo(item.startTime || 0, true);
            if (this.autoplay) {
                this.player?.playVideo();
            }
        }
    }

    play(): void {
        this.logger.log('play');
        this.paused$.next(false);
        if (this.src === this.loadedSrc) {
            this.player?.playVideo();
        }
    }

    pause(): void {
        this.logger.log('pause');
        this.paused$.next(true);
        if (this.player?.getCurrentTime()) {
            this.player?.pauseVideo();
        } else {
            this.player?.stopVideo();
        }
    }

    stop(): void {
        this.logger.log('stop');
        this.paused$.next(true);
        if (this.item?.startTime) {
            this.item$.next({...this.item, startTime: 0});
        }
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

    private get item(): PlayableItem | null {
        return this.item$.value;
    }

    private get paused(): boolean {
        return this.paused$.value;
    }

    private get src(): string | undefined {
        return this.item?.src;
    }

    private observeItem(): Observable<PlayableItem | null> {
        return this.item$.pipe(distinctUntilChanged());
    }

    private observePaused(): Observable<boolean> {
        return this.paused$.pipe(distinctUntilChanged());
    }

    private observeAspectRatio(): Observable<number> {
        return this.observeVideoId().pipe(
            switchMap((videoId) =>
                videoId ? this.getAspectRatio(videoId) : of(defaultAspectRatio)
            )
        );
    }

    private observeSize(): Observable<Size> {
        return this.size$.pipe(
            distinctUntilChanged(compareSize),
            filter(({width, height}) => width * height > 0)
        );
    }

    private observeState(): Observable<YT.PlayerState> {
        return this.state$;
    }

    private observeVideoSize(): Observable<Size> {
        return combineLatest([this.observeSize(), this.observeAspectRatio()]).pipe(
            map(([{width, height}, aspectRatio]) => {
                const newHeight = Math.max(Math.round(width / aspectRatio), height);
                const newWidth = Math.max(Math.round(newHeight * aspectRatio), width);
                return {width: newWidth, height: newHeight};
            }),
            distinctUntilChanged(compareSize)
        );
    }

    private async createPlayer(): Promise<void> {
        if (this.player) {
            return;
        }
        await this.loadPlayer();
        const loaded = await this.waitForPlayer();
        if (!loaded) {
            throw Error('YouTube player not loaded');
        }
    }

    private async loadAndPlay(item: PlayableItem): Promise<void> {
        if (this.paused) {
            return;
        }
        const [, , videoId] = item.src.split(':');
        this.player!.loadVideoById(videoId, item.startTime);
        this.loadedSrc = item.src;
        this.videoId$.next(videoId);
    }

    private getAspectRatio(videoId: string): Observable<number> {
        return from(youtubeApi.getMediaItem(videoId)).pipe(
            takeUntil(timer(3000)),
            takeUntil(this.observeVideoId().pipe(skip(1))),
            map(({aspectRatio}) => aspectRatio || defaultAspectRatio),
            catchError((error) => {
                this.logger.warn(
                    `Could not obtain oembed info (videoId=${videoId}): ${error.message}`
                );
                this.error$.next(error);
                return of(defaultAspectRatio);
            })
        );
    }

    private async loadPlayer(): Promise<void> {
        if (this.Player) {
            return;
        }

        const isConnected = await this.waitForConnection();
        if (!isConnected) {
            throw Error('YouTube player not loaded');
        }

        const Player = YouTubeFactory(this.targetId, {playerVars, host} as any);

        Player.on('ready', ({target}: any) => {
            (this as any).player = target;
            target.setVolume(this.volume * 100);
            if (this.muted || this.volume === 0) {
                target.mute();
            }
            this.playerLoaded$.next(true);
        });

        Player.on('stateChange', ({data}) => this.state$.next(data));
        Player.on('error', (error) => this.error$.next(error));

        this.Player = Player;
    }

    private async waitForConnection(): Promise<boolean> {
        if (this.element.isConnected) {
            return true;
        }
        if (this.hasWaited) {
            return false;
        }
        return new Promise((resolve) => {
            const observer = new MutationObserver(() => {
                if (this.element.isConnected) {
                    clearTimeout(timeoutId);
                    observer.disconnect();
                    resolve(true);
                }
            });
            const timeoutId = setTimeout(() => {
                observer.disconnect();
                resolve(false);
            }, 2000);
            observer.observe(document, {childList: true, subtree: true});
        });
    }

    private async waitForPlayer(): Promise<boolean> {
        const playerLoaded$ = this.playerLoaded$;
        let loaded = playerLoaded$.value;
        if (!loaded && !this.hasWaited) {
            const loaded$ = playerLoaded$.pipe(filter((loaded) => loaded));
            const timeout$ = timer(3000).pipe(map(() => false));
            loaded = await firstValueFrom(race(loaded$, timeout$));
            this.hasWaited = true;
        }
        return loaded;
    }
}
