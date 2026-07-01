import type {Observable} from 'rxjs';
import {EMPTY} from 'rxjs';
import Player from 'types/Player';
import Visualizer from 'types/Visualizer';
import VisualizerProviderId from 'types/VisualizerProviderId';

export default abstract class AbstractVisualizerPlayer<T extends Visualizer> implements Player<T> {
    #autoplay = false;
    loop = true;
    muted = true;
    volume = 0;

    abstract hidden: boolean;
    abstract appendTo(parentElement: HTMLElement): void;
    abstract load(visualizer: T): void;
    abstract play(): void;
    abstract pause(): void;
    abstract stop(): void;
    abstract resize(width: number, height: number): void;

    constructor(readonly providerId: VisualizerProviderId) {}

    get autoplay(): boolean {
        return this.#autoplay;
    }

    set autoplay(autoplay: boolean) {
        this.#autoplay = autoplay;
    }

    observeCurrentTime(): Observable<number> {
        return EMPTY;
    }

    observeDuration(): Observable<number> {
        return EMPTY;
    }

    observeEnded(): Observable<void> {
        return EMPTY;
    }

    observeError(): Observable<unknown> {
        return EMPTY;
    }

    observePlaying(): Observable<void> {
        return EMPTY;
    }

    canPlay(visualizer: Visualizer): boolean {
        return visualizer.providerId === this.providerId;
    }

    seek(): void {
        // do nothing
    }
}
