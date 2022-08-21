import theme from 'services/theme';
import AbstractVisualizer from './AbstractVisualizer';
import {Logger} from 'utils';

const logger = new Logger('Waveform');

export default class Waveform extends AbstractVisualizer<void> {
    private readonly canvas = document.createElement('canvas');
    private readonly canvasContext = this.canvas.getContext('2d')!;
    private animationFrameId = 0;

    constructor(private readonly analyser: AnalyserNode) {
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
                this.render();
            }
        }
    }

    appendTo(parentElement: HTMLElement): void {
        parentElement.append(this.canvas);
    }

    load(): void {
        logger.log('load');
        // A bit weird but `autoplay` controls looping.
        this.play();
    }

    play(): void {
        logger.log('play');
        if (!this.animationFrameId) {
            this.render();
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
        this.renderFrame();
    }

    private clear(): void {
        const width = this.canvas.width;
        const height = this.canvas.height;
        this.canvasContext.clearRect(0, 0, width, height);
    }

    private render(): void {
        this.renderFrame();
        if (this.autoplay && !this.canvas.hidden) {
            this.animationFrameId = requestAnimationFrame(() => this.render());
        }
    }

    private renderFrame(): void {
        const bufferSize = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferSize);
        const canvasContext = this.canvasContext;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const sliceWidth = width / bufferSize;
        let x = 0;
        canvasContext.lineWidth = 2;
        if (theme.isLight && theme.isFrameLight) {
            canvasContext.strokeStyle = theme.frameColor;
        } else {
            canvasContext.strokeStyle = theme.textColor;
        }
        canvasContext.clearRect(0, 0, width, height);
        canvasContext.beginPath();
        this.analyser.getByteTimeDomainData(dataArray);
        for (let i = 0; i < bufferSize; i++) {
            const v = dataArray[i] / 128.0;
            const y = (v * height) / 2;
            if (i === 0) {
                canvasContext.moveTo(x, y);
            } else {
                canvasContext.lineTo(x, y);
            }
            x += sliceWidth;
        }
        canvasContext.lineTo(width, height / 2);
        canvasContext.stroke();
    }
}
