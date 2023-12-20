import type {Observable} from 'rxjs';
import {Subject} from 'rxjs';
import butterchurn from 'butterchurn';
import AudioManager from 'types/AudioManager';
import {ButterchurnVisualizer} from 'types/Visualizer';
import AbstractVisualizerPlayer from 'services/players/AbstractVisualizerPlayer';
import {Logger} from 'utils';

const logger = new Logger('ButterchurnPlayer');

export default class ButterchurnPlayer extends AbstractVisualizerPlayer<ButterchurnVisualizer> {
    private readonly canvas = document.createElement('canvas');
    private readonly context2D = this.canvas.getContext('2d')!;
    private readonly source: AudioNode;
    private readonly visualizer: butterchurn.Visualizer;
    private readonly error$ = new Subject<unknown>();
    private animationFrameId = 0;
    private currentVisualizer = '';

    constructor({context, source}: AudioManager) {
        super();
        this.source = source;
        this.canvas.className = 'visualizer visualizer-butterchurn';
        this.canvas.hidden = true;
        this.visualizer = butterchurn.createVisualizer(context, this.canvas, {
            width: 400,
            height: 200,
        });
    }

    get hidden(): boolean {
        return this.canvas.hidden;
    }

    set hidden(hidden: boolean) {
        if (this.canvas.hidden !== hidden) {
            this.canvas.hidden = hidden;
            if (hidden) {
                logger.log('disconnect');
                this.visualizer.disconnectAudio(this.source);
            } else {
                logger.log('connect');
                this.visualizer.connectAudio(this.source);
                if (!this.animationFrameId) {
                    this.render();
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

    load(visualizer: ButterchurnVisualizer): void {
        logger.log('load', visualizer.name);
        if (this.currentVisualizer !== visualizer.name) {
            this.currentVisualizer = visualizer.name;
            this.cancelAnimation();
            this.visualizer.loadPreset(visualizer.data, 0.5);
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
        this.visualizer.render(); // Need to render at least once before we resize
        this.visualizer.setRendererSize(width, height);
        this.visualizer.render();
    }

    private clear(): void {
        const {width, height} = this.canvas;
        this.context2D.clearRect(0, 0, width, height);
    }

    private render(): void {
        // try/catch on first render only
        if (!this.animationFrameId) {
            try {
                this.visualizer.render();
            } catch (err) {
                logger.error(err);
                this.error$.next(err);
            }
        } else {
            this.visualizer.render();
        }
        if (this.autoplay && !this.canvas.hidden) {
            this.animationFrameId = requestAnimationFrame(() => this.render());
        }
    }

    private cancelAnimation(): void {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = 0;
        }
    }
}
