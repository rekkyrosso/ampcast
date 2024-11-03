import type {Observable} from 'rxjs';
import {distinctUntilChanged, map, Subject, tap} from 'rxjs';
import butterchurn from 'butterchurn';
import AudioManager from 'types/AudioManager';
import NextVisualizerReason from 'types/NextVisualizerReason';
import {ButterchurnVisualizer} from 'types/Visualizer';
import {Logger} from 'utils';
import spotifyAudioAnalyser from 'services/spotify/spotifyAudioAnalyser';
import visualizerSettings, {
    observeVisualizerSettings,
} from 'services/visualizer/visualizerSettings';
import AbstractVisualizerPlayer from '../AbstractVisualizerPlayer';

const logger = new Logger('ButterchurnPlayer');

export default class ButterchurnPlayer extends AbstractVisualizerPlayer<ButterchurnVisualizer> {
    private readonly canvas = document.createElement('canvas');
    private readonly context2D = this.canvas.getContext('2d')!;
    private readonly source: AudioNode;
    private readonly visualizer: butterchurn.Visualizer;
    private readonly error$ = new Subject<unknown>();
    private animationFrameId = 0;
    private currentVisualizer: ButterchurnVisualizer | null = null;

    constructor({context, source}: AudioManager) {
        super();
        this.source = source;
        this.canvas.className = 'visualizer visualizer-butterchurn';
        this.canvas.hidden = true;
        this.visualizer = butterchurn.createVisualizer(context, this.canvas, {
            width: 400,
            height: 200,
        });

        const {analyser, fft} = (this.visualizer as any).audio;
        const timeToFrequencyDomain = fft.timeToFrequencyDomain;

        fft.timeToFrequencyDomain = (waveDataIn: Uint8Array): Float32Array => {
            if (analyser.isPlayingSpotify) {
                return spotifyAudioAnalyser.getFrequencyData(waveDataIn.length / 2);
            } else {
                return timeToFrequencyDomain.call(fft, waveDataIn);
            }
        };

        observeVisualizerSettings()
            .pipe(
                map((settings) => settings.butterchurnTransparency),
                distinctUntilChanged(),
                tap(() => this.toggleOpacity())
            )
            .subscribe(logger);

        // Log errors.
        this.error$.subscribe(logger.error);
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

    load(visualizer: ButterchurnVisualizer & {reason: NextVisualizerReason}): void {
        logger.log('load', visualizer.name);
        if (visualizer.name !== this.currentVisualizer?.name) {
            this.currentVisualizer = visualizer;
            this.cancelAnimation();
            this.visualizer.loadPreset(
                visualizer.data,
                visualizer.reason === 'transition'
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
            // TODO: This spams error messages if no audio has played yet.
            this.visualizer.setRendererSize(width, height);
            if (this.animationFrameId) {
                this.visualizer.render();
            }
        } catch (err) {
            if (__dev__) {
                logger.warn(err);
            }
        }
    }

    private clear(): void {
        const {width, height} = this.canvas;
        this.context2D.clearRect(0, 0, width, height);
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
            !visualizerSettings.butterchurnTransparency || !!this.currentVisualizer?.opaque
        );
    }
}
