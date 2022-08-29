import {SpotifyVizVisualizer} from 'types/Visualizer';
import {ActiveIntervals, SpotifyAudioAnalyser} from 'services/spotify/spotifyAudioAnalyser';
import AbstractVisualizer from './AbstractVisualizer';
import {Logger} from 'utils';

const logger = new Logger('SpotifyViz');

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

export default class SpotifyViz extends AbstractVisualizer<SpotifyVizVisualizer> {
    private readonly canvas = document.createElement('canvas');
    private readonly context2D = this.canvas.getContext('2d')!;
    private config?: SpotifyVizConfig;
    private animationFrameId = 0;

    constructor(private readonly analyser: SpotifyAudioAnalyser) {
        super();
        this.canvas.hidden = true;
        this.canvas.className = `visualizer visualizer-spotify-viz`;

        analyser.observeBars().subscribe((bar: ActiveIntervals['bars']) => {
            this.config?.onBar?.(bar);
        });

        analyser.observeBeats().subscribe((beat: ActiveIntervals['beats']) => {
            this.config?.onBeat?.(beat);
        });

        analyser.observeSections().subscribe((section: ActiveIntervals['sections']) => {
            this.config?.onSection?.(section);
        });

        analyser.observeSegments().subscribe((segment: ActiveIntervals['segments']) => {
            this.config?.onSegment?.(segment);
        });

        analyser.observeTatums().subscribe((tatum: ActiveIntervals['tatums']) => {
            this.config?.onTatum?.(tatum);
        });
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

    load(visualizer: SpotifyVizVisualizer): void {
        logger.log('load');
        if (visualizer) {
            logger.log(`Using SpotifyViz preset: ${visualizer.name}`);
            this.config = visualizer.config;
            this.analyser.volumeSmoothing = visualizer.config?.volumeSmoothing ?? 100;
            this.analyser.fftSize = 2048;
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
