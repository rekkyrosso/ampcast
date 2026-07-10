import type {Observable} from 'rxjs';
import {
    EMPTY,
    BehaviorSubject,
    asapScheduler,
    distinctUntilChanged,
    filter,
    interval,
    map,
    switchMap,
} from 'rxjs';
import MediaItem from 'types/MediaItem';
import PlaylistItem from 'types/PlaylistItem';
import Player from 'types/Player';
import {exists} from 'utils';
import mediaPlayback from 'services/mediaPlayback';
import HTML5Player from './HTML5Player';
import observeNearEnd from './observeNearEnd';

export default class GaplessPlayer implements Player<MediaItem> {
    private readonly element = document.createElement('div');
    private readonly player$ = new BehaviorSubject<HTML5Player>(this.player1);
    private readonly nextItem$ = new BehaviorSubject<MediaItem | null>(null);
    #autoplay = false;
    #silent = false;

    constructor(
        private readonly player1: HTML5Player,
        private readonly player2: HTML5Player
    ) {
        this.element.id = 'gaplessPlayer';

        this.player1.appendTo(this.element);
        this.player2.appendTo(this.element);

        // Load next track.
        this.observeCurrentPlayer()
            .pipe(
                switchMap((player) => observeNearEnd(player, 5)),
                switchMap((nearEnd) => (nearEnd ? this.nextItem$ : EMPTY)),
                distinctUntilChanged(),
                filter(exists)
            )
            .subscribe((nextItem) => {
                this.nextPlayer.load(nextItem);
            });

        // Gapless playback.
        this.observeCurrentPlayer()
            .pipe(
                switchMap((player) =>
                    observeNearEnd(player, 2).pipe(
                        switchMap((nearEnd) => (nearEnd ? interval(4, asapScheduler) : EMPTY)),
                        map(() => {
                            const {currentTime, duration, item} = player;
                            // These numbers come from the 'feishin' project.
                            const delay = item?.container === 'flac' ? 0.065 : 0.116;
                            return currentTime + delay >= duration;
                        }),
                        distinctUntilChanged(),
                        filter((atEnd) => atEnd)
                    )
                )
            )
            .subscribe(() => {
                if (
                    !mediaPlayback.stopAfterCurrent &&
                    !this.loop &&
                    this.autoplay &&
                    this.nextItem &&
                    this.nextItem.src === this.nextPlayer.src
                ) {
                    this.nextPlayer.play();
                }
            });
    }

    get autoplay(): boolean {
        return this.#autoplay;
    }

    set autoplay(autoplay: boolean) {
        this.#autoplay = autoplay;
        this.currentPlayer.autoplay = autoplay;
    }

    get hidden(): boolean {
        return !!this.element.hidden;
    }

    set hidden(hidden: boolean) {
        this.element.hidden = hidden;
    }

    get loop(): boolean {
        return this.currentPlayer.loop;
    }

    set loop(loop: boolean) {
        this.player1.loop = loop;
        this.player2.loop = loop;
    }

    get muted(): boolean {
        return this.currentPlayer.muted;
    }

    set muted(muted: boolean) {
        this.player1.muted = muted;
        this.player2.muted = muted;
    }

    get volume(): number {
        return this.currentPlayer.volume;
    }

    set volume(volume: number) {
        this.player1.volume = volume;
        this.player2.volume = volume;
    }

    observeCurrentTime(): Observable<number> {
        return this.observeCurrentPlayer().pipe(
            switchMap((player) => player.observeCurrentTime()),
            filter(() => !this.#silent)
        );
    }

    observeDuration(): Observable<number> {
        return this.observeCurrentPlayer().pipe(
            switchMap((player) => player.observeDuration()),
            filter(() => !this.#silent)
        );
    }

    observeEnded(): Observable<void> {
        return this.observeCurrentPlayer().pipe(
            switchMap((player) => player.observeEnded()),
            filter(() => !this.#silent)
        );
    }

    observeError(): Observable<unknown> {
        return this.observeCurrentPlayer().pipe(
            switchMap((player) => player.observeError()),
            filter(() => !this.#silent)
        );
    }

    observeNowPlaying(station: PlaylistItem): Observable<PlaylistItem> {
        return this.observeCurrentPlayer().pipe(
            switchMap((player) => player.observeNowPlaying(station)),
            filter(() => !this.#silent)
        );
    }

    observePlaying(): Observable<void> {
        return this.observeCurrentPlayer().pipe(
            switchMap((player) => player.observePlaying()),
            filter(() => !this.#silent)
        );
    }

    appendTo(parentElement: HTMLElement): void {
        parentElement.appendChild(this.element);
    }

    canPlay(item: MediaItem): boolean {
        return this.player1.canPlay(item);
    }

    load(item: MediaItem): void {
        const prevPlayer = this.currentPlayer;
        const nextPlayer = this.nextPlayer.src === item.src ? this.nextPlayer : prevPlayer;
        const isLoaded = nextPlayer.src === item.src;

        this.#silent = !isLoaded;
        this.player$.next(nextPlayer);
        this.#silent = false;

        prevPlayer.autoplay = false;
        nextPlayer.autoplay = this.autoplay;

        if (isLoaded) {
            if (item.startTime) {
                nextPlayer.seek(item.startTime);
            }
            if (this.autoplay) {
                nextPlayer.play();
            }
        } else {
            nextPlayer.load(item);
        }
    }

    loadNext(item: MediaItem | null): void {
        this.nextItem$.next(item);
    }

    play(): void {
        this.currentPlayer.play();
    }

    pause(): void {
        this.autoplay = false;
        this.currentPlayer.pause();
    }

    stop(): void {
        this.autoplay = false;
        this.currentPlayer.stop();
        this.nextPlayer.stop();
    }

    seek(time: number): void {
        this.currentPlayer.seek(time);
    }

    resize(): void {
        // Not visible.
    }

    private get currentPlayer(): HTML5Player {
        return this.player$.value;
    }

    private get nextItem(): MediaItem | null {
        return this.nextItem$.value;
    }

    private get nextPlayer(): HTML5Player {
        return this.currentPlayer === this.player1 ? this.player2 : this.player1;
    }

    private observeCurrentPlayer(): Observable<HTML5Player> {
        return this.player$.pipe(distinctUntilChanged());
    }
}
