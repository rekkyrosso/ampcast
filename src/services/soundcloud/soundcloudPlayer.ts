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
import soundcloud from './soundcloud';

const logger = new Logger('soundcloudPlayer');

type SoundCloudIFramePlayer = any; // TODO

export class SoundCloudPlayer implements Player<PlayableItem> {
    private player: SoundCloudIFramePlayer | null = null;
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
        this.element.className = 'soundcloud-player';
        this.element.allow = 'autoplay';
        this.element.style.visibility = soundcloud.iframeAudioPlayback?.showContent
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
            this.player?.seekTo((item.startTime || 0) * 1000);
            if (this.autoplay) {
                this.player?.play();
            }
        }
    }

    play(): void {
        logger.log('play');
        this.stopped = false;
        this.paused$.next(false);
        if (this.src === this.loadedSrc) {
            this.player?.play();
        }
    }

    pause(): void {
        logger.log('pause');
        this.paused$.next(true);
        this.player?.pause();
    }

    stop(): void {
        logger.log('stop');
        this.stopped = true;
        this.paused$.next(true);
        this.player?.pause();
        this.player?.seekTo(0);
        this.currentTime$.next(0);
        this.loadedSrc = ''; // Re-load (seems to always work)
        if (this.item?.startTime) {
            this.item$.next({...this.item, startTime: 0});
        }
    }

    seek(time: number): void {
        this.player?.seekTo(time * 1000);
    }

    resize(): void {
        // Not needed.
    }

    private get Widget(): any {
        return window.SC?.Widget;
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

    private get url(): string | undefined {
        const item = this.item;
        if (item) {
            const [, type, id] = item.src.split(':');
            return type === 'tracks' ? `https://api.soundcloud.com/tracks/${id}` : item.srcs?.[0];
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
            throw Error('SoundCloud player not loaded');
        }
    }

    private async loadPlayer(): Promise<void> {
        if (this.Widget) {
            return;
        }
        const Widget = await this.loadScript();

        const {READY, PLAY, PLAY_PROGRESS, FINISH, ERROR} = Widget.Events;
        const player = Widget(this.element);

        player.bind(READY, () => {
            this.synchVolume();

            player.bind(PLAY, () => this.playing$.next());
            player.bind(PLAY_PROGRESS, ({currentPosition}: {currentPosition: number}) => {
                if (!this.stopped) {
                    this.currentTime$.next(currentPosition / 1000);
                }
            });
            player.bind(FINISH, () => this.ended$.next());
            player.bind(ERROR, (e: unknown) => this.error$.next(e));

            this.player = player;
            this.playerLoaded$.next(true);
        });
    }

    private async loadScript(): Promise<any> {
        if (this.Widget) {
            return this.Widget;
        }
        if (!this.url) {
            throw Error('No media source');
        }
        const host = 'https://w.soundcloud.com/player';
        this.element.src = `${host}/?url=${encodeURIComponent(this.url)}`;
        await loadScript(`${host}/api.js`);
        return this.Widget;
    }

    private async loadAndPlay(item: PlayableItem): Promise<void> {
        if (this.paused) {
            return;
        }

        if (!this.url) {
            throw Error('No media source');
        }

        const startTime = item.startTime;

        this.player.load(this.url, {
            auto_play: true,
            visual: true,
            single_active: false,
            buying: false,
            sharing: false,
            liking: false,
            download: false,
            show_artwork: true,
            show_comments: false,
            callback: () => {
                this.loadedSrc = item.src;
                this.synchVolume();
                this.player.getDuration((duration: number) => {
                    this.duration$.next(duration / 1000);
                });
                if (startTime) {
                    this.player.seekTo(startTime * 1000);
                }
            },
        });
    }

    private synchVolume(): void {
        this.player?.setVolume(this.muted ? 0 : this.volume * 100);
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

export default new SoundCloudPlayer();
