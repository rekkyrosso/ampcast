import type {Observable} from 'rxjs';
import {
    EMPTY,
    BehaviorSubject,
    Subject,
    catchError,
    distinctUntilChanged,
    filter,
    interval,
    map,
    mergeMap,
    of,
    switchMap,
    take,
    skipWhile,
    tap,
} from 'rxjs';
import PlayableItem from 'types/PlayableItem';
import Player from 'types/Player';
import {loadLibrary, Logger} from 'utils';
import audio from 'services/audio';
import {waitForLogin, observeIsLoggedIn} from 'services/mediaServices';

const logger = new Logger('tidalPlayer');

export class TidalPlayer implements Player<PlayableItem> {
    private player: TidalMusicPlayer | null = null;
    private readonly item$ = new BehaviorSubject<PlayableItem | null>(null);
    private readonly paused$ = new BehaviorSubject(true);
    private readonly playing$ = new Subject<void>();
    private readonly duration$ = new Subject<number>();
    private readonly ended$ = new Subject<void>();
    private readonly error$ = new Subject<unknown>();
    private hasWaited = false;
    private loadedSrc = '';
    autoplay = false;
    hidden = true;
    loop = false;
    #muted = true;
    #volume = 1;

    constructor() {
        // Load new tracks/videos.
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

        // Stop and emit an error on logout.
        // The media player will only emit the error if this player is the current player.
        observeIsLoggedIn('tidal')
            .pipe(
                skipWhile((isLoggedIn) => !isLoggedIn),
                filter((isLoggedIn) => !isLoggedIn),
                tap(() => this.stop()),
                tap(() => this.error$.next(Error('Not logged in')))
            )
            .subscribe(logger);

        this.observeError().subscribe(logger.error);
    }

    get muted(): boolean {
        return this.#muted;
    }

    set muted(muted: boolean) {
        if (this.#muted !== muted) {
            this.#muted = muted;
            this.synchVolume();
        }
    }

    get volume(): number {
        return this.#volume;
    }

    set volume(volume: number) {
        if (this.#volume !== volume) {
            this.#volume = volume;
            this.synchVolume();
        }
    }

    observeCurrentTime(): Observable<number> {
        return this.observePaused().pipe(
            switchMap((paused) =>
                paused
                    ? of(this.player?.getAssetPosition() || 0)
                    : interval(250).pipe(map(() => this.player?.getAssetPosition() || 0))
            ),
            distinctUntilChanged()
        );
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

    appendTo(): void {
        // Automatically appended by TIDAL Web SDK.
    }

    load(item: PlayableItem): void {
        logger.log('load', item.src);
        this.item$.next(item);
        this.paused$.next(!this.autoplay);
        if (item.src === this.loadedSrc) {
            this.player?.seek(item.startTime || 0);
            if (this.autoplay) {
                this.player?.play();
            }
        }
    }

    play(): void {
        logger.log('play');
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
        this.paused$.next(true);
        this.player?.reset();
        this.loadedSrc = '';
        if (this.item?.startTime) {
            this.item$.next({...this.item, startTime: 0});
        }
    }

    seek(time: number): void {
        this.player?.seek(time);
    }

    resize(): void {
        // TODO
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

    private async createPlayer(): Promise<void> {
        if (this.player) {
            return;
        }

        const player = await this.loadPlayer();
        const events = player.events;

        events.addEventListener('playback-state-change', (event) => {
            const {
                detail: {state},
            } = event as CustomEvent;
            const context = player.getPlaybackContext();
            const duration = context?.actualDuration || 0;
            this.duration$.next(duration);
            if (state === 'PLAYING') {
                this.playing$.next();
            }
        });

        events.addEventListener('ended', () => {
            if (!this.paused) {
                this.ended$.next();
            }
        });

        events.addEventListener('error', (err) => this.error$.next(err));

        if (!this.hasWaited && this.item) {
            await waitForLogin('tidal', 3000);
            this.hasWaited = true;
        }

        const {credentialsProvider} = await import(
            /* webpackMode: "weak" */
            '@tidal-music/auth'
        );

        player.setCredentialsProvider(credentialsProvider);

        this.synchVolume();
    }

    private async loadPlayer(): Promise<TidalMusicPlayer> {
        if (this.player) {
            return this.player;
        }
        await loadLibrary('tidal-player');
        const player = await import(
            /* webpackMode: "weak" */
            '@tidal-music/player'
        );
        this.player = player;
        return player;
    }

    private async loadAndPlay(item: PlayableItem): Promise<void> {
        if (this.paused) {
            return;
        }
        const [, productType, productId] = item.src.split(':') as [
            'tidal',
            'track' | 'video',
            string
        ];
        await this.player!.load(
            {
                productId,
                productType,
                sourceId: productId,
                sourceType: 'TRACK',
            },
            item.startTime || 0
        );
        this.loadedSrc = item.src;
        if (!this.paused) {
            try {
                await this.player!.play();
            } catch (err) {
                if (!this.paused) {
                    throw err;
                }
            }
        }
    }

    private synchVolume(): void {
        if (this.player && this.src) {
            const [, type] = this.src.split(':');
            this.player.setVolumeLevel(
                // Audio volume is handled by a `GainNode`.
                !audio.streamingSupported || /video/i.test(type)
                    ? this.muted
                        ? 0
                        : this.volume
                    : 1
            );
        }
    }
}

export default new TidalPlayer();
