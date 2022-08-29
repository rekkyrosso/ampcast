import SimpleAudioAnalyser from 'types/SimpleAudioAnalyser';
import {WaveformVisualizer} from 'types/Visualizer';
import AbstractVisualizer from './AbstractVisualizer';
import {Logger} from 'utils';

const logger = new Logger('Waveform');

export interface WaveformConfig {
    fftSize?: number;
    onPaint: (data: WaveformPaintData) => void;
}

export interface WaveformPaintData {
    readonly context2D: CanvasRenderingContext2D;
    readonly width: number;
    readonly height: number;
    readonly now: number;
    readonly analyser: Readonly<SimpleAudioAnalyser>;
}

export default class Waveform extends AbstractVisualizer<WaveformVisualizer> {
    private readonly canvas = document.createElement('canvas');
    private readonly context2D = this.canvas.getContext('2d')!;
    private config?: WaveformConfig;
    private animationFrameId = 0;

    constructor(private readonly analyser: SimpleAudioAnalyser) {
        super();
        this.canvas.hidden = true;
        this.canvas.className = `visualizer visualizer-waveform`;
    }

    get hidden(): boolean {
        return this.canvas.hidden;
    }

    set hidden(hidden: boolean) {
        if (this.canvas.hidden !== hidden) {
            this.canvas.hidden = hidden;
            if (!hidden && !this.animationFrameId) {
                this.render(performance.now());
            }
        }
    }

    appendTo(parentElement: HTMLElement): void {
        parentElement.append(this.canvas);
    }

    load(visualizer: WaveformVisualizer): void {
        logger.log('load');
        if (visualizer) {
            logger.log(`Using Waveform preset: ${visualizer.name}`);
            this.config = visualizer.config;
            this.analyser.fftSize = visualizer.config.fftSize || 2048;
        }
        if (this.autoplay) {
            this.play();
        }
    }

    play(): void {
        logger.log('play');
        if (!this.animationFrameId) {
            this.render(performance.now());
        }
    }

    pause(): void {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = 0;
        }
    }

    stop(): void {
        this.pause();
        this.clear();
    }

    resize(width: number, height: number): void {
        this.canvas.width = width;
        this.canvas.height = height;
        this.renderFrame(performance.now());
    }

    private clear(): void {
        const width = this.canvas.width;
        const height = this.canvas.height;
        this.context2D.clearRect(0, 0, width, height);
    }

    private render(now: number): void {
        this.renderFrame(now);
        if (this.autoplay && !this.canvas.hidden) {
            this.animationFrameId = requestAnimationFrame((now) => this.render(now));
        }
    }

    private renderFrame(now: number): void {
        const context2D = this.context2D;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const analyser = this.analyser;
        this.config?.onPaint?.({context2D, width, height, now, analyser});
    }
}
