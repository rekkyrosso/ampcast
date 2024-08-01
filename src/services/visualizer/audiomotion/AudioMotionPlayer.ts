import {tap} from 'rxjs';
import AudioMotionAnalyzer from 'audiomotion-analyzer';
import {TinyColor} from '@ctrl/tinycolor';
import AudioManager from 'types/AudioManager';
import {AudioMotionVisualizer} from 'types/Visualizer';
import theme from 'services/theme';
import AbstractVisualizerPlayer from '../AbstractVisualizerPlayer';
import {Logger} from 'utils';

const logger = new Logger('AudioMotionPlayer');

export default class AudioMotionPlayer extends AbstractVisualizerPlayer<AudioMotionVisualizer> {
    private readonly element = document.createElement('div');
    private readonly source: AudioNode;
    private readonly visualizer: AudioMotionAnalyzer;
    private currentVisualizer = '';

    constructor({context, source}: AudioManager) {
        super();

        this.source = source;
        this.element.className = `visualizer visualizer-audiomotion`;
        this.element.hidden = true;

        this.visualizer = new AudioMotionAnalyzer(this.element, {
            audioCtx: context,
            showBgColor: false,
            overlay: true,
            showScaleX: false,
            showScaleY: false,
            connectSpeakers: false,
            start: false,
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
                logger.log('disconnect');
                this.visualizer.disconnectInput();
            } else {
                logger.log('connect');
                this.visualizer.connectInput(this.source);
            }
        }
    }

    appendTo(parentElement: HTMLElement): void {
        parentElement.append(this.element);
    }

    load(visualizer: AudioMotionVisualizer): void {
        logger.log('load', visualizer.name);
        if (this.currentVisualizer !== visualizer.name) {
            this.currentVisualizer = visualizer.name;
            this.visualizer.setOptions(visualizer.options);
        }
        if (this.autoplay) {
            this.visualizer.toggleAnalyzer(true);
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
        logger.log('stop');
        this.visualizer.toggleAnalyzer(false);
    }

    resize(width: number, height: number): void {
        this.element.style.width = `${width}px`;
        this.element.style.height = `${height}px`;
    }

    private registerGradients(): void {
        const brightColor = new TinyColor(
            theme.isMediaButtonLight ? theme.mediaButtonColor : theme.defaultMediaButtonColor
        );
        const luminousColor =
            [
                new TinyColor(theme.mediaButtonColor),
                new TinyColor(theme.defaultMediaButtonColor),
                new TinyColor(theme.frameColor),
                new TinyColor(theme.frameTextColor),
                new TinyColor(theme.backgroundColor),
                new TinyColor(theme.textColor),
            ]
                .filter(
                    (color) =>
                        color.getBrightness() < 200 &&
                        color.getLuminance() > 0.3 &&
                        color.toHsl().s > 0.3
                )
                .sort((a, b) => b.getLuminance() - a.getLuminance())[0] || brightColor;
        const colors = luminousColor
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
