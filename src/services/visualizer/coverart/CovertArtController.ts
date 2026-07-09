import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged} from 'rxjs';
import AudioManager from 'types/AudioManager';
import {CoverArtVisualizer} from 'types/Visualizer';
import {Logger} from 'utils';
import AbstractVisualizerPlayer from '../AbstractVisualizerPlayer';
import CovertArtPlayer from './CovertArtPlayer';

const logger = new Logger('CovertArtController');

export default class CovertArtController extends AbstractVisualizerPlayer<CoverArtVisualizer> {
    readonly player0: CovertArtPlayer;
    readonly player1: CovertArtPlayer;
    private element: HTMLElement | null = null;
    private hidden$ = new BehaviorSubject(false);
    #currentIndex: 0 | 1 = 0;

    constructor(audio: AudioManager) {
        super('coverart');

        this.player0 = new CovertArtPlayer(audio);
        this.player1 = new CovertArtPlayer(audio);
    }

    get autoplay(): boolean {
        return this.player0.autoplay;
    }

    set autoplay(autoplay: boolean) {
        this.player0.autoplay = autoplay;
        this.player1.autoplay = autoplay;
    }

    get currentIndex(): 0 | 1 {
        return this.#currentIndex;
    }

    set currentIndex(index: 0 | 1) {
        this.currentPlayer.pause();
        this.#currentIndex = index;
        if (!this.hidden) {
            this.currentPlayer.play();
        }
    }

    get hidden(): boolean {
        return this.hidden$.value;
    }

    set hidden(hidden: boolean) {
        this.hidden$.next(hidden);
        if (this.element) {
            this.element.hidden = hidden;
        }
        if (hidden) {
            this.currentPlayer.pause();
        } else {
            this.currentPlayer.play();
        }
    }

    observeHidden(): Observable<boolean> {
        return this.hidden$.pipe(distinctUntilChanged());
    }

    appendTo(element: HTMLElement): void {
        const beatsElement = element.querySelector('.beats-player') as HTMLElement;
        if (beatsElement) {
            element.hidden = this.hidden;
            this.element = element;
        }
    }

    load(): void {
        this.player0.load();
        this.player1.load();
    }

    play(): void {
        logger.log('play');
        this.currentPlayer.play();
    }

    pause(): void {
        logger.log('pause');
        this.currentPlayer.pause();
    }

    stop(): void {
        logger.log('stop');
        this.player0.stop();
        this.player1.stop();
    }

    resize(width: number, height: number): void {
        this.player0.resize(width, height);
        this.player1.resize(width, height);
    }

    private get currentPlayer(): CovertArtPlayer {
        return this.currentIndex === 0 ? this.player0 : this.player1;
    }
}
