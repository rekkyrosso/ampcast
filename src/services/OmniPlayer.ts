import type {Observable} from 'rxjs';
import {EMPTY, BehaviorSubject, Subject, merge, of} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';
import {SetReturnType} from 'type-fest';
import Player from 'types/Player';

export default class OmniPlayer<T, S = T> implements Player<T> {
    private readonly player$ = new BehaviorSubject<Player<S> | null>(null);
    private readonly error$ = new Subject<unknown>();
    #autoplay = false;
    #hidden = false;
    #muted = false;

    constructor(
        private readonly players: Player<S>[],
        private readonly selectPlayer: SetReturnType<Player<T>['load'], Player<S> | null>,
        private readonly loadPlayer: (player: Player<S>, src: T) => void
    ) {
        players.forEach((player) => {
            player.autoplay = false;
            player.muted = true;
            player.hidden = true;
        });
    }

    get hidden(): boolean {
        return this.#hidden;
    }

    set hidden(hidden: boolean) {
        this.#hidden = hidden;
        if (this.currentPlayer) {
            this.currentPlayer.hidden = hidden;
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

    get loop(): boolean {
        return this.players[0].loop;
    }

    set loop(loop: boolean) {
        this.players.forEach((player) => (player.loop = loop));
    }

    get muted(): boolean {
        return this.#muted;
    }

    set muted(muted: boolean) {
        this.#muted = muted;
        if (this.currentPlayer) {
            this.currentPlayer.muted = muted;
        }
    }

    get volume(): number {
        return this.players[0].volume;
    }

    set volume(volume: number) {
        this.players.forEach((player) => (player.volume = volume));
    }

    observeCurrentTime(): Observable<number> {
        return this.observeCurrentPlayer().pipe(
            switchMap((player) => (player ? player.observeCurrentTime() : of(0))),
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
            switchMap((player) => (player ? merge(this.error$, player.observeError()) : EMPTY))
        );
    }

    observePlaying(): Observable<void> {
        return this.observeCurrentPlayer().pipe(
            switchMap((player) => (player ? player.observePlaying() : EMPTY))
        );
    }

    appendTo(parentElement: HTMLElement): void {
        this.players.forEach((player) => player.appendTo(parentElement));
    }

    load(src: T): void {
        const prevPlayer = this.currentPlayer;
        const nextPlayer = this.selectPlayer(src);

        this.player$.next(null); // turn off event streams

        if (prevPlayer && prevPlayer !== nextPlayer) {
            prevPlayer.muted = true;
            prevPlayer.hidden = true;
            prevPlayer.stop();
        }

        this.player$.next(nextPlayer);

        if (nextPlayer) {
            try {
                nextPlayer.autoplay = this.autoplay;
                this.loadPlayer(nextPlayer, src);
                nextPlayer.muted = this.muted;
                nextPlayer.hidden = this.hidden;
            } catch (err) {
                this.error$.next(err);
            }
        } else {
            this.error$.next(Error('No player found.'));
        }
    }

    play(): void {
        this.autoplay = true;
        this.currentPlayer?.play();
    }

    pause(): void {
        this.autoplay = false;
        this.currentPlayer?.pause();
    }

    stop(): void {
        this.autoplay = false;
        this.currentPlayer?.stop();
    }

    seek(time: number): void {
        this.currentPlayer?.seek(time);
    }

    resize(width: number, height: number): void {
        if (width * height > 0) {
            this.players.forEach((player) => player.resize(width, height));
        }
    }

    private get currentPlayer(): Player<S> | null {
        return this.player$.getValue();
    }

    private observeCurrentPlayer(): Observable<Player<S> | null> {
        return this.player$.pipe(distinctUntilChanged());
    }
}
