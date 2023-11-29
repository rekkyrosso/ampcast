import AudioManager from 'types/AudioManager';
import {WaveformVisualizer} from 'types/Visualizer';
import AbstractVisualizerPlayer from 'services/players/AbstractVisualizerPlayer';
import {Logger} from 'utils';

export interface WaveformConfig {
    onPaint: (data: WaveformPaintData) => void;
}

export interface WaveformPaintData {
    readonly context2D: CanvasRenderingContext2D;
    readonly width: number;
    readonly height: number;
    readonly now: number;
    readonly analyser: Readonly<AnalyserNode>;
}

export default class WaveformPlayer extends AbstractVisualizerPlayer<WaveformVisualizer> {
    private readonly logger = new Logger(`WaveformPlayer/${this.name}`);
    private readonly analyser: AnalyserNode;
    private readonly canvas = document.createElement('canvas');
    private readonly context2D = this.canvas.getContext('2d')!;
    private readonly source: AudioNode;
    private config?: WaveformConfig;
    private animationFrameId = 0;
    private currentVisualizer = '';

    constructor({context, source}: AudioManager, readonly name: string) {
        super();
        this.source = source;
        this.analyser = context.createAnalyser();
        this.canvas.hidden = true;
        this.canvas.className = `visualizer visualizer-waveform visualizer-waveform-${name}`;
    }

    get hidden(): boolean {
        return this.canvas.hidden;
    }

    set hidden(hidden: boolean) {
        if (this.canvas.hidden !== hidden) {
            this.canvas.hidden = hidden;
            if (hidden) {
                this.logger.log('disconnect');
                this.cancelAnimation();
                this.source.disconnect(this.analyser);
            } else {
                this.logger.log('connect');
                this.source.connect(this.analyser);
                if (!this.animationFrameId) {
                    this.render();
                }
            }
        }
    }

    appendTo(parentElement: HTMLElement): void {
        parentElement.append(this.canvas);
    }

    load(visualizer: WaveformVisualizer): void {
        if (this.currentVisualizer !== visualizer.name) {
            this.currentVisualizer = visualizer.name;
            this.cancelAnimation();
            this.config = visualizer.config;
            this.render();
        }
    }

    play(): void {
        this.logger.log('play');
        if (!this.animationFrameId) {
            this.render();
        }
    }

    pause(): void {
        this.logger.log('pause');
        this.cancelAnimation();
    }

    stop(): void {
        this.logger.log('stop');
        this.cancelAnimation();
        this.clear();
    }

    resize(width: number, height: number): void {
        this.canvas.width = width;
        this.canvas.height = height;
        this.renderFrame();
    }

    private clear(): void {
        const width = this.canvas.width;
        const height = this.canvas.height;
        this.context2D.clearRect(0, 0, width, height);
    }

    private render(now = performance.now()): void {
        this.renderFrame(now);
        if (this.autoplay && !this.hidden) {
            this.animationFrameId = requestAnimationFrame((now) => this.render(now));
        }
    }

    private renderFrame(now = performance.now()): void {
        const context2D = this.context2D;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const analyser = this.analyser;
        this.config?.onPaint?.({context2D, width, height, now, analyser});
    }

    private cancelAnimation(): void {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = 0;
        }
    }
}
