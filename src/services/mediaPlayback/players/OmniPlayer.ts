import type {Observable} from 'rxjs';
import {
    EMPTY,
    BehaviorSubject,
    Subject,
    distinctUntilChanged,
    filter,
    merge,
    switchMap,
} from 'rxjs';
import AudioManager from 'types/AudioManager';
import Player from 'types/Player';

export type CanPlay<T> = (src: T) => boolean;

export default class OmniPlayer<T, S = T> implements Player<T> {
    private readonly element = document.createElement('div');
    private readonly player$ = new BehaviorSubject<Player<S> | null>(null);
    private readonly error$ = new Subject<unknown>();
    private stopped = true;
    #players: Map<Player<S>, CanPlay<T>> = new Map();
    #loadError: Error | null = null;
    #autoplay = false;
    #loop = false;
    #muted = false;
    #volume = 1;
    #width = 0;
    #height = 0;

    constructor(
        id: string,
        private readonly mapSrc: (src: T) => S = (src) => src as unknown as S,
        private readonly audio?: Pick<AudioManager, 'volume'>
    ) {
        this.element.id = id;
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
        return this.element.hidden;
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
        this.#loop = loop;
        for (const player of this.players) {
            player.loop = loop;
        }
    }

    get muted(): boolean {
        return this.#muted;
    }

    set muted(muted: boolean) {
        this.#muted = muted;
        if (this.currentPlayer) {
            this.currentPlayer.muted = muted;
        }
        if (this.audio) {
            this.audio.volume = muted ? 0 : this.volume;
        }
    }

    get volume(): number {
        return this.#volume;
    }

    set volume(volume: number) {
        this.#volume = volume;
        for (const player of this.players) {
            player.volume = volume;
        }
        if (this.audio) {
            this.audio.volume = this.muted ? 0 : volume;
        }
    }

    observeCurrentTime(): Observable<number> {
        return this.observeCurrentPlayer().pipe(
            switchMap((player) => (player ? player.observeCurrentTime() : EMPTY)),
            distinctUntilChanged()
        );
    }

    observeDuration(): Observable<number> {
        return this.observeCurrentPlayer().pipe(
            switchMap((player) => (player ? player.observeDuration() : EMPTY)),
            distinctUntilChanged()
        );
    }

    observeEnded(): Observable<void> {
        return this.observeCurrentPlayer().pipe(
            switchMap((player) => (player ? player.observeEnded() : EMPTY))
        );
    }

    observeError(): Observable<unknown> {
        return this.observeCurrentPlayer().pipe(
            switchMap((player) => (player ? merge(this.error$, player.observeError()) : EMPTY)),
            filter(() => !this.stopped)
        );
    }

    observePlaying(): Observable<void> {
        return this.observeCurrentPlayer().pipe(
            switchMap((player) => (player ? player.observePlaying() : EMPTY))
        );
    }

    appendTo(parentElement: HTMLElement): void {
        parentElement.appendChild(this.element);
    }

    load(src: T): void {
        const prevPlayer = this.currentPlayer;
        const nextPlayer = this.selectPlayer(src);

        this.player$.next(null); // turn off event streams

        if (prevPlayer && prevPlayer !== nextPlayer) {
            prevPlayer.autoplay = false;
            prevPlayer.muted = true;
            prevPlayer.hidden = true;
            prevPlayer.stop();
        }

        if (this.autoplay) {
            this.stopped = false;
        }

        this.loadError = null;

        if (nextPlayer && !this.#players.has(nextPlayer)) {
            this.loadError = Error('Player not registered');
            return;
        }

        this.player$.next(nextPlayer);

        if (nextPlayer) {
            try {
                nextPlayer.autoplay = this.autoplay;
                nextPlayer.load(this.mapSrc(src));
                nextPlayer.muted = this.muted;
                nextPlayer.hidden = this.hidden;
            } catch (err: any) {
                this.loadError = Error(err?.message || 'Failed to load');
            }
        } else {
            this.loadError = Error('No player found');
        }
    }

    loadNext(src: T | null): void {
        try {
            const nextPlayer = src ? this.selectPlayer(src) : null;
            nextPlayer?.loadNext?.(this.mapSrc(src!));
            for (const player of this.players) {
                if (player !== nextPlayer) {
                    player.loadNext?.(null);
                }
            }
        } catch (err) {
            console.error(err);
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

    resize(width: number, height: number): void {
        this.#width = width;
        this.#height = height;
        if (width * height > 0) {
            for (const player of this.players) {
                player.resize(width, height);
            }
        }
    }

    registerPlayer(player: Player<S>, canPlay: CanPlay<T>): void {
        if (!this.#players.has(player)) {
            player.muted = true;
            player.hidden = true;
            player.autoplay = this.autoplay;
            player.loop = this.loop;
            player.volume = this.volume;
            if (this.#width * this.#height > 0) {
                player.resize(this.#width, this.#height);
            }
            player.appendTo(this.element);
            this.#players.set(player, canPlay);
        }
    }

    registerPlayers(players: [Player<S>, CanPlay<T>][]): void {
        for (const [player, canPlay] of players) {
            this.registerPlayer(player, canPlay);
        }
    }

    selectPlayer(src: T): Player<S> | null {
        // Test most recent entries first.
        // > The Map object holds key-value pairs and remembers the original insertion order of the keys.
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
        const entries = [...this.#players.entries()].reverse();
        for (const [player, canPlay] of entries) {
            if (canPlay(src)) {
                return player;
            }
        }
        return null;
    }

    unregisterPlayer(player: Player<S>): void {
        if (this.#players.has(player)) {
            if (this.currentPlayer === player) {
                player.stop();
            }
            this.#players.delete(player);
        }
    }

    private get currentPlayer(): Player<S> | null {
        return this.player$.getValue();
    }

    private get loadError(): Error | null {
        return this.#loadError;
    }

    private set loadError(error: Error | null) {
        this.#loadError = error;
        if (error) {
            this.error$.next(error);
        }
    }

    private get players(): IterableIterator<Player<S>> {
        return this.#players.keys();
    }

    private observeCurrentPlayer(): Observable<Player<S> | null> {
        return this.player$.pipe(distinctUntilChanged());
    }
}
