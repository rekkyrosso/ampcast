import type {Observable} from 'rxjs';
import {
    EMPTY,
    BehaviorSubject,
    Subject,
    distinctUntilChanged,
    filter,
    merge,
    switchMap,
    of,
} from 'rxjs';
import Player from 'types/Player';
import PlaylistItem from 'types/PlaylistItem';

export type CanPlay<T> = (src: T) => boolean;

export default class OmniPlayer<T> implements Player<T> {
    private readonly players: Player<T>[] = [];
    private readonly player$ = new BehaviorSubject<Player<T> | null>(null);
    private readonly error$ = new Subject<unknown>();
    private stopped = true;
    private silent = true;
    #element: HTMLElement = document.createElement('div');
    #loadError: Error | null = null;
    #autoplay = false;
    #loop = false;
    #muted = false;
    #volume = 1;
    #width = 0;
    #height = 0;

    constructor(id: string, players: Player<T>[] = []) {
        this.element.id = id;
        for (const player of players) {
            this.addPlayer(player);
        }
    }

    get autoplay(): boolean {
        return this.#autoplay;
    }

    set autoplay(autoplay: boolean) {
        this.#autoplay = autoplay;
        if (this.currentPlayer) {
            this.currentPlayer.autoplay = autoplay;
        }
    }

    get hidden(): boolean {
        return !!this.element.hidden;
    }

    set hidden(hidden: boolean) {
        this.element.hidden = hidden;
        if (this.currentPlayer) {
            this.currentPlayer.hidden = hidden;
        }
    }

    get loop(): boolean {
        return this.#loop;
    }

    set loop(loop: boolean) {
        if (this.#loop !== loop) {
            this.#loop = loop;
            for (const player of this.players) {
                player.loop = loop;
            }
        }
    }

    get muted(): boolean {
        return this.#muted;
    }

    set muted(muted: boolean) {
        if (this.#muted !== muted) {
            this.#muted = muted;
            if (this.currentPlayer) {
                this.currentPlayer.muted = muted;
            }
        }
    }

    get volume(): number {
        return this.#volume;
    }

    set volume(volume: number) {
        if (this.#volume !== volume) {
            this.#volume = volume;
            for (const player of this.players) {
                player.volume = volume;
            }
        }
    }

    observeCanSkipNext(): Observable<boolean> {
        return this.observeCurrentPlayer().pipe(
            switchMap((player) => player?.observeCanSkipNext?.() ?? of(false)),
            filter(() => !this.silent)
        );
    }

    observeCanSkipPrev(): Observable<boolean> {
        return this.observeCurrentPlayer().pipe(
            switchMap((player) => player?.observeCanSkipPrev?.() ?? of(false)),
            filter(() => !this.silent)
        );
    }

    observeCurrentTime(): Observable<number> {
        return this.observeCurrentPlayer().pipe(
            switchMap((player) => (player ? player.observeCurrentTime() : EMPTY)),
            filter(() => !this.silent)
        );
    }

    observeDuration(): Observable<number> {
        // Make sure this re-emits when a new item is loaded.
        return this.player$.pipe(
            switchMap((player) => (player ? player.observeDuration() : EMPTY)),
            filter(() => !this.silent)
        );
    }

    observeEnded(): Observable<void> {
        return this.observeCurrentPlayer().pipe(
            switchMap((player) => (player ? player.observeEnded() : EMPTY)),
            filter(() => !this.silent)
        );
    }

    observeError(): Observable<unknown> {
        return this.observeCurrentPlayer().pipe(
            switchMap((player) => (player ? merge(this.error$, player.observeError()) : EMPTY)),
            filter(() => !this.silent && !this.stopped)
        );
    }

    observeNowPlaying(station: PlaylistItem): Observable<PlaylistItem> {
        return this.observeCurrentPlayer().pipe(
            switchMap((player) => player?.observeNowPlaying?.(station) ?? of(station)),
            distinctUntilChanged(),
            filter(() => !this.silent)
        );
    }

    observePlaying(): Observable<void> {
        return this.observeCurrentPlayer().pipe(
            switchMap((player) => (player ? player.observePlaying() : EMPTY)),
            filter(() => !this.silent)
        );
    }

    addPlayer(player: Player<T>): void {
        if (!this.players.includes(player)) {
            player.muted = true;
            player.hidden = true;
            player.autoplay = false;
            player.loop = this.loop;
            player.volume = this.volume;
            if (this.#width * this.#height > 0) {
                player.resize(this.#width, this.#height);
            }
            player.appendTo(this.element);
            this.players.push(player);
        }
    }

    appendTo(parentElement: HTMLElement): void {
        parentElement.appendChild(this.element);
    }

    canPlay(src: T): boolean {
        return this.players.some((player) => player.canPlay(src));
    }

    load(src: T | null): void {
        const prevPlayer = this.currentPlayer;
        const nextPlayer = this.selectPlayer(src);

        this.loadError = null;
        this.silent = true; // turn off event streams

        if (prevPlayer && prevPlayer !== nextPlayer) {
            prevPlayer.autoplay = false;
            prevPlayer.muted = true;
            prevPlayer.hidden = true;
            prevPlayer.stop();
        }

        if (this.autoplay) {
            this.stopped = false;
        }

        this.player$.next(nextPlayer);
        this.silent = false; // turn on event streams

        if (nextPlayer) {
            try {
                // `validate` throws if `src` is not valid.
                if (this.validate(src)) {
                    nextPlayer.autoplay = this.autoplay;
                    nextPlayer.load(src);
                    nextPlayer.muted = this.muted;
                    nextPlayer.hidden = this.hidden;
                }
            } catch (err: any) {
                this.loadError = Error(err?.message || 'Failed to load');
            }
        } else {
            this.loadError = Error('No player found');
        }
    }

    loadNext(src: T | null): void {
        try {
            // `validate` throws if `src` is not valid.
            if (this.validate(src)) {
                const nextPlayer = src ? this.selectPlayer(src) : null;
                nextPlayer?.loadNext?.(src);
                for (const player of this.players) {
                    if (player !== nextPlayer) {
                        player.loadNext?.(null);
                    }
                }
            }
        } catch {
            // Ignore.
        }
    }

    play(): void {
        this.stopped = false;
        this.autoplay = true;
        if (this.loadError) {
            this.error$.next(this.loadError);
        } else {
            this.currentPlayer?.play();
        }
    }

    pause(): void {
        this.autoplay = false;
        this.currentPlayer?.pause();
    }

    stop(): void {
        this.stopped = true;
        this.autoplay = false;
        this.currentPlayer?.stop();
    }

    seek(time: number): void {
        this.currentPlayer?.seek(time);
    }

    async skipNext(): Promise<void> {
        return this.currentPlayer?.skipNext?.();
    }

    async skipPrev(): Promise<void> {
        return this.currentPlayer?.skipPrev?.();
    }

    resize(width: number, height: number): void {
        this.#width = width;
        this.#height = height;
        if (width * height > 0) {
            for (const player of this.players) {
                player.resize(width, height);
            }
        }
    }

    selectPlayer(src: T | null): Player<T> | null {
        // Test most recent entries first.
        return src ? (this.players.findLast((player) => player.canPlay(src)) ?? null) : null;
    }

    useElement(element: HTMLElement): void {
        element.hidden = this.hidden;
        for (const player of this.players) {
            player.appendTo(element);
        }
        this.#element = element;
    }

    protected get currentPlayer(): Player<T> | null {
        return this.player$.value;
    }

    protected get loadError(): Error | null {
        return this.#loadError;
    }

    protected set loadError(error: Error | null) {
        this.#loadError = error;
        if (error) {
            this.error$.next(error);
        }
    }

    protected observeCurrentPlayer(): Observable<Player<T> | null> {
        return this.player$.pipe(distinctUntilChanged());
    }

    protected validate(src: T | null): src is T {
        // Throw if `src` is not valid.
        if (!src) {
            throw Error('No source');
        }
        return true;
    }

    private get element(): HTMLElement {
        return this.#element;
    }
}
