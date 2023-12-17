import {SpotifyVizVisualizer} from 'types/Visualizer';
import {ActiveIntervals, SpotifyAudioAnalyser} from 'services/spotify/spotifyAudioAnalyser';
import AbstractVisualizerPlayer from 'services/players/AbstractVisualizerPlayer';
import spotifyAudioAnalyser from 'services/spotify/spotifyAudioAnalyser';
import {Logger} from 'utils';

const logger = new Logger('SpotifyVizPlayer');

export interface SpotifyVizConfig {
    volumeSmoothing?: number;
    onPaint?: (data: SpotifyVizPaintData) => void;
    onBar?: (bar: ActiveIntervals['bars']) => void;
    onBeat?: (beat: ActiveIntervals['beats']) => void;
    onSection?: (section: ActiveIntervals['sections']) => void;
    onSegment?: (segment: ActiveIntervals['segments']) => void;
    onTatum?: (tatum: ActiveIntervals['tatums']) => void;
}

export interface SpotifyVizPaintData {
    readonly context2D: CanvasRenderingContext2D;
    readonly width: number;
    readonly height: number;
    readonly now: number;
    readonly analyser: Readonly<SpotifyAudioAnalyser>;
}

export default class SpotifyVizPlayer extends AbstractVisualizerPlayer<SpotifyVizVisualizer> {
    private readonly analyser = spotifyAudioAnalyser;
    private readonly canvas = document.createElement('canvas');
    private readonly context2D = this.canvas.getContext('2d')!;
    private config?: SpotifyVizConfig;
    private animationFrameId = 0;
    private currentVisualizer = '';

    constructor() {
        super();
        this.canvas.hidden = true;
        this.canvas.className = `visualizer visualizer-spotifyviz`;

        const analyser = this.analyser;

        analyser.observeBar().subscribe((bar: ActiveIntervals['bars']) => {
            this.config?.onBar?.(bar);
        });

        analyser.observeBeat().subscribe((beat: ActiveIntervals['beats']) => {
            this.config?.onBeat?.(beat);
        });

        analyser.observeSection().subscribe((section: ActiveIntervals['sections']) => {
            this.config?.onSection?.(section);
        });

        analyser.observeSegment().subscribe((segment: ActiveIntervals['segments']) => {
            this.config?.onSegment?.(segment);
        });

        analyser.observeTatum().subscribe((tatum: ActiveIntervals['tatums']) => {
            this.config?.onTatum?.(tatum);
        });
    }

    get hidden(): boolean {
        return this.canvas.hidden;
    }

    set hidden(hidden: boolean) {
        if (this.canvas.hidden !== hidden) {
            this.canvas.hidden = hidden;
            if (hidden) {
                this.cancelAnimation();
            } else {
                if (!this.animationFrameId) {
                    this.render();
                }
            }
        }
    }

    appendTo(parentElement: HTMLElement): void {
        parentElement.append(this.canvas);
    }

    load(visualizer: SpotifyVizVisualizer): void {
        logger.log('load', visualizer.name);
        if (this.currentVisualizer !== visualizer.name) {
            this.currentVisualizer = visualizer.name;
            this.cancelAnimation();
            this.config = visualizer.config;
            this.analyser.volumeSmoothing = visualizer.config?.volumeSmoothing ?? 100;
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
        this.canvas.width = Math.round(width);
        this.canvas.height = Math.round(height);
        this.renderFrame();
    }

    private clear(): void {
        const width = this.canvas.width;
        const height = this.canvas.height;
        this.context2D.clearRect(0, 0, width, height);
    }

    private render(now = performance.now()): void {
        this.renderFrame(now);
        if (this.autoplay && !this.canvas.hidden) {
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
