import type {Observable} from 'rxjs';
import {
    EMPTY,
    BehaviorSubject,
    Subject,
    catchError,
    distinctUntilChanged,
    filter,
    firstValueFrom,
    map,
    mergeMap,
    of,
    race,
    switchMap,
    take,
    timer,
} from 'rxjs';
import PlayableItem from 'types/PlayableItem';
import Player from 'types/Player';
import {loadScript, Logger} from 'utils';
import mixcloud from './mixcloud';

const logger = new Logger('mixcloudPlayer');

type MixcloudIFramePlayer = any; // TODO

export class MixcloudPlayer implements Player<PlayableItem> {
    private player: MixcloudIFramePlayer | null = null;
    private readonly element = document.createElement('iframe');
    private readonly item$ = new BehaviorSubject<PlayableItem | null>(null);
    private readonly paused$ = new BehaviorSubject(true);
    private readonly playing$ = new Subject<void>();
    private readonly currentTime$ = new Subject<number>();
    private readonly duration$ = new Subject<number>();
    private readonly ended$ = new Subject<void>();
    private readonly error$ = new Subject<unknown>();
    private readonly playerLoaded$ = new BehaviorSubject(false);
    private loadedSrc = '';
    private stopped = false;
    private hasWaited = false;
    autoplay = false;
    loop = false;
    #muted = true;
    #volume = 1;

    constructor() {
        this.element.hidden = true;
        this.element.className = 'mixcloud-player';
        this.element.allow = 'autoplay';
        this.element.style.visibility = mixcloud.iframeAudioPlayback?.showContent
            ? 'inherit'
            : 'hidden';

        // Load new media.
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

    observeEnded(): Observable<void> {
        return this.ended$;
    }

    observeError(): Observable<unknown> {
        return this.error$;
    }

    observePlaying(): Observable<void> {
        return this.playing$;
    }

    appendTo(parentElement: HTMLElement): void {
        parentElement.appendChild(this.element);
    }

    load(item: PlayableItem): void {
        logger.log('load', item.src);
        if (this.autoplay) {
            this.stopped = false;
        }
        this.item$.next(item);
        this.paused$.next(!this.autoplay);
        if (item.src === this.loadedSrc) {
            this.player?.seek(item.startTime || 0);
            if (this.autoplay) {
                this.safePlay();
            }
        }
    }

    play(): void {
        logger.log('play');
        this.stopped = false;
        this.paused$.next(false);
        if (this.src === this.loadedSrc) {
            this.safePlay();
        }
    }

    pause(): void {
        logger.log('pause');
        this.paused$.next(true);
        this.safePause();
    }

    stop(): void {
        logger.log('stop');
        this.stopped = true;
        this.paused$.next(true);
        this.safePause();
        this.currentTime$.next(0);
        this.loadedSrc = ''; // Force re-load.
        if (this.item?.startTime) {
            this.item$.next({...this.item, startTime: 0});
        }
    }

    seek(time: number): void {
        this.player?.seek(time);
    }

    resize(): void {
        // Not needed.
    }

    private get Widget(): any {
        return (window as any).Mixcloud?.PlayerWidget;
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

    private get key(): string | undefined {
        const src = this.item?.srcs?.[0];
        if (src) {
            const url = new URL(src);
            return url.pathname;
        }
    }

    private observeItem(): Observable<PlayableItem | null> {
        return this.item$.pipe(distinctUntilChanged());
    }

    private observePaused(): Observable<boolean> {
        return this.paused$.pipe(distinctUntilChanged());
    }

    private async createPlayer(): Promise<void> {
        if (this.player) {
            return;
        }
        await this.loadPlayer();
        const loaded = await this.waitForPlayer();
        if (!loaded) {
            throw Error('Mixcloud player not loaded');
        }
    }

    private async loadPlayer(): Promise<void> {
        if (this.Widget) {
            return;
        }

        if (!this.key) {
            throw Error('No media source');
        }

        await loadScript('https://widget.mixcloud.com/media/js/widgetApi.js');

        const player = this.Widget(this.element);

        player.ready.then(() => {
            const events = player.events;

            this.synchVolume();

            events.play.on(() => {
                if (this.paused) {
                    player.pause();
                } else {
                    this.playing$.next();
                }
            });
            events.pause.on(() => {
                if (!this.paused) {
                    player.play();
                }
            });
            events.progress.on((currentTime: number, duration: number) => {
                this.duration$.next(duration);
                if (!this.stopped) {
                    this.currentTime$.next(currentTime);
                }
            });
            events.ended.on(() => {
                this.ended$.next();
            });
            events.error.on((err: unknown) => {
                this.error$.next(err);
            });

            this.player = player;
            this.playerLoaded$.next(true);
        });

        this.element.src = `https://www.mixcloud.com/widget/iframe/?feed=${this.key}`;
    }

    private async loadAndPlay(item: PlayableItem): Promise<void> {
        if (this.paused) {
            return;
        }

        if (!this.key) {
            throw Error('No media source');
        }

        const startTime = item.startTime || 0;

        // Don't use async functions here (doesn't seem true async).
        this.player.getCurrentKey().then((currentKey: string) => {
            if (this.key === currentKey) {
                this.loadedSrc = item.src;
                this.player.getPosition().then((currentTime: number) => {
                    if (currentTime === startTime) {
                        this.player.play();
                    } else {
                        // `seek` seems to autoplay (but calling `play` after seems dodgy).
                        this.player.seek(startTime);
                        this.player.getIsPaused().then((paused: boolean) => {
                            if (paused && !this.paused) {
                                this.player.play();
                            } else if (!paused && this.paused) {
                                this.player.pause();
                            }
                        });
                    }
                });
            } else {
                this.player.load(this.key, true);
                this.loadedSrc = item.src;
            }
        });
    }

    private safePlay(): void {
        this.player?.getIsPaused().then((paused: boolean) => {
            if (paused && !this.paused) {
                this.player.play();
            }
        });
    }

    private safePause(): void {
        this.player?.getIsPaused().then((paused: boolean) => {
            if (!paused && this.paused) {
                this.player.pause();
            }
        });
    }

    private synchVolume(): void {
        this.player?.setVolume(this.muted ? 0 : this.volume);
    }

    private async waitForPlayer(): Promise<boolean> {
        const playerLoaded$ = this.playerLoaded$;
        let loaded = playerLoaded$.value;
        if (!loaded && !this.hasWaited) {
            const loaded$ = playerLoaded$.pipe(filter((loaded) => loaded));
            const timeout$ = timer(6000).pipe(map(() => false));
            loaded = await firstValueFrom(race(loaded$, timeout$));
            this.hasWaited = true;
        }
        return loaded;
    }
}

export default new MixcloudPlayer();
