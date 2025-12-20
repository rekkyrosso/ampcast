import type {Observable} from 'rxjs';
import {distinctUntilChanged, fromEvent, map, Subject, tap} from 'rxjs';
import butterchurn from 'butterchurn';
import AudioManager from 'types/AudioManager';
import {ButterchurnVisualizer, VisualizerReason} from 'types/Visualizer';
import {Logger} from 'utils';
import visualizerSettings, {
    observeVisualizerSettings,
} from 'services/visualizer/visualizerSettings';
import AbstractVisualizerPlayer from '../AbstractVisualizerPlayer';

const logger = new Logger('ButterchurnPlayer');

export default class ButterchurnPlayer extends AbstractVisualizerPlayer<ButterchurnVisualizer> {
    #visualizer?: butterchurn.Visualizer;
    private readonly canvas = document.createElement('canvas');
    private readonly context: AudioContext;
    private readonly source: AudioNode;
    private readonly error$ = new Subject<unknown>();
    private animationFrameId = 0;
    private currentPreset: ButterchurnVisualizer | null = null;

    constructor({context, source}: AudioManager) {
        super();
        this.context = context;
        this.source = source;
        this.canvas.className = 'visualizer visualizer-butterchurn';
        this.canvas.hidden = true;

        observeVisualizerSettings()
            .pipe(
                map((settings) => settings.butterchurnTransparency),
                distinctUntilChanged(),
                tap(() => this.toggleOpacity())
            )
            .subscribe(logger);

        fromEvent(window, 'pagehide').subscribe(() => {
            this.#visualizer?.disconnectAudio(this.source);
            this.#visualizer = undefined;
        });

        // Log errors.
        this.error$.subscribe(logger.error);
    }

    get hidden(): boolean {
        return this.canvas.hidden;
    }

    set hidden(hidden: boolean) {
        if (this.canvas.hidden !== hidden) {
            this.canvas.hidden = hidden;
            if (this.#visualizer) {
                if (hidden) {
                    logger.log('disconnect');
                    this.#visualizer.disconnectAudio(this.source);
                } else {
                    logger.log('connect');
                    this.#visualizer.connectAudio(this.source);
                    if (!this.animationFrameId) {
                        this.render();
                    }
                }
            }
        }
    }

    observeError(): Observable<unknown> {
        return this.error$;
    }

    appendTo(parentElement: HTMLElement): void {
        parentElement.append(this.canvas);
    }

    load(preset: ButterchurnVisualizer & VisualizerReason): void {
        logger.log('load', preset.name);
        if (preset.name !== this.currentPreset?.name) {
            this.currentPreset = preset;
            this.cancelAnimation();
            this.#visualizer?.loadPreset(
                preset.data,
                preset.reason === 'transition'
                    ? visualizerSettings.butterchurnTransitionDuration
                    : 0
            );
            this.toggleOpacity();
        }
        if (this.autoplay && !this.animationFrameId) {
            this.render();
        }
    }

    play(): void {
        logger.log('play');
        if (!this.animationFrameId) {
            this.render();
        }
    }

    pause(): void {
        logger.log('pause');
        this.cancelAnimation();
    }

    stop(): void {
        logger.log('stop');
        this.cancelAnimation();
        this.clear();
    }

    resize(width: number, height: number): void {
        width = Math.ceil(width);
        height = Math.ceil(height);
        this.canvas.width = width;
        this.canvas.height = height;
        try {
            if (this.#visualizer) {
                this.#visualizer.setRendererSize(width, height);
                if (this.animationFrameId) {
                    this.#visualizer.render();
                }
            }
        } catch (err) {
            if (__dev__) {
                logger.warn(err);
            }
        }
    }

    private get visualizer(): butterchurn.Visualizer {
        if (!this.#visualizer) {
            const visualizer = butterchurn.createVisualizer(this.context, this.canvas, {
                width: this.canvas.width,
                height: this.canvas.height,
            });
            if (this.currentPreset) {
                visualizer.loadPreset(this.currentPreset.data, 0);
            }
            if (!this.hidden) {
                visualizer.connectAudio(this.source);
            }
            this.#visualizer = visualizer;
        }
        return this.#visualizer!;
    }

    private clear(): void {
        const {width, height} = this.canvas;
        const context2D = this.canvas.getContext('2d')!;
        context2D.clearRect(0, 0, width, height);
    }

    private render(): void {
        try {
            this.visualizer.render();
        } catch (err) {
            this.error$.next(err);
        }
        if (this.autoplay && !this.hidden) {
            this.animationFrameId = requestAnimationFrame(() => this.render());
        }
    }

    private cancelAnimation(): void {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = 0;
        }
    }

    private toggleOpacity(): void {
        this.canvas.classList.toggle(
            'opaque',
            !visualizerSettings.butterchurnTransparency || !!this.currentPreset?.opaque
        );
    }
}
