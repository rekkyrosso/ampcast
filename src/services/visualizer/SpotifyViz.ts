import Visualizer from './spotify-viz/Visualizer';
import {SpotifyVizVisualizer} from 'types/Visualizer';
import AbstractVisualizer from './AbstractVisualizer';
import {Logger} from 'utils';

const logger = new Logger('SpotifyViz');

export default class SpotifyViz extends AbstractVisualizer<SpotifyVizVisualizer> {
    private readonly element = document.createElement('div');
    private readonly visualizer = new Visualizer();

    constructor() {
        super();
        this.visualizer.appendTo(this.element);
        this.element.hidden = true;
        this.element.className = `visualizer visualizer-spotify-viz`;
    }

    get hidden(): boolean {
        return this.element.hidden;
    }

    set hidden(hidden: boolean) {
        this.element.hidden = hidden;
    }

    appendTo(parentElement: HTMLElement): void {
        parentElement.append(this.element);
    }

    load(visualizer: SpotifyVizVisualizer): void {
        logger.log('load');
        this.visualizer.load(visualizer.config);
        if (this.autoplay) {
            this.visualizer.start();
        }
    }

    play(): void {
        logger.log('play');
        this.visualizer.start();
    }

    pause(): void {
        logger.log('pause');
        this.visualizer.stop();
    }

    stop(): void {
        logger.log('stop');
        this.visualizer.stop();
    }

    resize(width: number, height: number): void {
        this.element.style.width = `${width}px`;
        this.element.style.height = `${height}px`;
        this.visualizer.resize(width, height);
    }
}
