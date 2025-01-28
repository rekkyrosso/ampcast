import type {Observable} from 'rxjs';
import {
    EMPTY,
    BehaviorSubject,
    distinctUntilChanged,
    filter,
    interval,
    map,
    switchMap,
    withLatestFrom,
} from 'rxjs';
import PlayableItem from 'types/PlayableItem';
import Player from 'types/Player';
import HTML5Player from './HTML5Player';

export default class DualAudioPlayer implements Player<PlayableItem> {
    private readonly element = document.createElement('div');
    private readonly player$ = new BehaviorSubject<HTML5Player>(this.player1);
    private nextItem: PlayableItem | null = null;
    #autoplay = false;

    constructor(
        name: string,
        private readonly player1: HTML5Player,
        private readonly player2: HTML5Player
    ) {
        this.player1.appendTo(this.element);
        this.player2.appendTo(this.element);

        this.observeCurrentPlayer().subscribe((player) => {
            this.element.className = `dual-audio-${name} player-${player === this.player1 ? 1 : 2}`;
        });

        // Gapless playback.
        this.observeCurrentTime()
            .pipe(
                withLatestFrom(this.observeDuration()),
                map(([currentTime, duration]) => duration - currentTime < 2),
                distinctUntilChanged(),
                switchMap((nearEnd) => (nearEnd ? interval(10) : EMPTY)),
                map(() => {
                    const {currentTime, duration, item} = this.currentPlayer;
                    // These numbers come from the 'feishin' project.
                    const delay = item?.container === 'flac' ? 0.065 : 0.116;
                    return currentTime + delay >= duration;
                }),
                distinctUntilChanged(),
                filter((atEnd) => atEnd)
            )
            .subscribe(() => {
                if (this.nextItem && this.nextItem.src === this.nextPlayer.src) {
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
        return this.element.hidden;
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
        return this.observeCurrentPlayer().pipe(switchMap((player) => player.observeCurrentTime()));
    }

    observeDuration(): Observable<number> {
        return this.observeCurrentPlayer().pipe(switchMap((player) => player.observeDuration()));
    }

    observeEnded(): Observable<void> {
        return this.observeCurrentPlayer().pipe(switchMap((player) => player.observeEnded()));
    }

    observeError(): Observable<unknown> {
        return this.observeCurrentPlayer().pipe(switchMap((player) => player.observeError()));
    }

    observePlaying(): Observable<void> {
        return this.observeCurrentPlayer().pipe(switchMap((player) => player.observePlaying()));
    }

    appendTo(parentElement: HTMLElement): void {
        parentElement.appendChild(this.element);
    }

    load(item: PlayableItem): void {
        const prevPlayer = this.currentPlayer;
        const nextPlayer = this.nextPlayer.src === item.src ? this.nextPlayer : this.currentPlayer;

        this.player$.next(nextPlayer);

        prevPlayer.autoplay = false;
        nextPlayer.autoplay = this.autoplay;

        if (nextPlayer.src !== item.src) {
            nextPlayer.load(item);
        } else if (this.autoplay) {
            nextPlayer.play();
        }
    }

    loadNext(item: PlayableItem | null): void {
        this.nextItem = item;
        if (item) {
            this.nextPlayer.load(item);
        }
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

    private get nextPlayer(): HTML5Player {
        return this.currentPlayer === this.player1 ? this.player2 : this.player1;
    }

    private observeCurrentPlayer(): Observable<HTML5Player> {
        return this.player$.pipe(distinctUntilChanged());
    }
}
