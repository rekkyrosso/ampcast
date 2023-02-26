import {Observable, tap} from 'rxjs';
import AudioMotionAnalyzer from 'audiomotion-analyzer';
import {TinyColor} from '@ctrl/tinycolor';
import {AudioMotionVisualizer} from 'types/Visualizer';
import AbstractVisualizerPlayer from 'services/players/AbstractVisualizerPlayer';
import theme from 'services/theme';
import {Logger} from 'utils';

const logger = new Logger('AudioMotionPlayer');

export default class AudioMotionPlayer extends AbstractVisualizerPlayer<AudioMotionVisualizer> {
    private readonly element: HTMLElement;
    private readonly visualizer: AudioMotionAnalyzer;
    private audioSourceNode: AudioNode;

    constructor(audioContext: AudioContext, audioSourceNode$: Observable<AudioNode>) {
        super();

        const container = (this.element = document.createElement('div'));

        container.hidden = true;
        container.className = `visualizer visualizer-audiomotion`;

        this.audioSourceNode = audioContext.createMediaElementSource(new Audio());

        const visualizer = (this.visualizer = new AudioMotionAnalyzer(container, {
            source: this.audioSourceNode,
            showBgColor: false,
            overlay: true,
            showScaleX: false,
            showScaleY: false,
            connectSpeakers: false,
        }));

        audioSourceNode$.subscribe((audioSourceNode) => {
            this.audioSourceNode = audioSourceNode;
            if (!this.element.hidden) {
                visualizer.connectInput(audioSourceNode);
            }
        });

        theme
            .observe()
            .pipe(tap(() => this.registerGradients()))
            .subscribe(logger);
    }

    get hidden(): boolean {
        return this.element.hidden;
    }

    set hidden(hidden: boolean) {
        if (this.element.hidden !== hidden) {
            this.element.hidden = hidden;
            if (hidden) {
                this.visualizer.disconnectInput();
            } else {
                this.visualizer.connectInput(this.audioSourceNode);
            }
        }
    }

    appendTo(parentElement: HTMLElement): void {
        parentElement.append(this.element);
    }

    load(visualizer: AudioMotionVisualizer): void {
        logger.log('load');
        if (visualizer) {
            logger.log(`Using AudioMotion visualizer: ${visualizer.name}`);
            this.visualizer.setOptions(visualizer.options);
        }
        if (this.autoplay) {
            this.play();
        }
    }

    play(): void {
        logger.log('play');
        this.visualizer.toggleAnalyzer(true);
    }

    pause(): void {
        logger.log('pause');
        this.visualizer.toggleAnalyzer(false);
    }

    stop(): void {
        this.visualizer.toggleAnalyzer(true);
    }

    resize(width: number, height: number): void {
        this.element.style.width = `${width}px`;
        this.element.style.height = `${height}px`;
    }

    private registerGradients(): void {
        const brightColor = new TinyColor(theme.defaultMediaButtonColor);
        const colors = new TinyColor(brightColor)
            .tetrad()
            .map((color) => color.toRgbString())
            .slice(1);
        this.visualizer.registerGradient('ampcast-classic', {
            bgColor: theme.black,
            colorStops: [colors[0], {pos: 0.6, color: colors[1]}, colors[2]],
        });
        this.visualizer.registerGradient('ampcast-prism', {
            bgColor: theme.black,
            colorStops: theme.getVisualizerColors() as any,
        });
        this.visualizer.registerGradient('ampcast-rainbow', {
            bgColor: theme.black,
            colorStops: brightColor.analogous().map((color) => color.toRgbString()) as any,
        });
    }
}
