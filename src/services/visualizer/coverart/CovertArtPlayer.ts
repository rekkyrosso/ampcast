import {distinctUntilChanged, map, tap} from 'rxjs';
import AudioManager from 'types/AudioManager';
import {CoverArtVisualizer} from 'types/Visualizer';
import AbstractVisualizerPlayer from 'services/players/AbstractVisualizerPlayer';
import visualizerSettings, {observeVisualizerSettings} from '../visualizerSettings';
import BeatsPlayer from '../waveform/BeatsPlayer';
import AnimatedBackgroundPlayer from './AnimatedBackgroundPlayer';
import {Logger} from 'utils';

const logger = new Logger('CovertArtPlayer');

export default class CovertArtPlayer extends AbstractVisualizerPlayer<CoverArtVisualizer> {
    private readonly animatedBackground: AnimatedBackgroundPlayer;
    private readonly beatsPlayer: BeatsPlayer;
    private element: HTMLElement | null = null;
    #hidden = true;

    constructor(audio: AudioManager) {
        super();

        this.animatedBackground = new AnimatedBackgroundPlayer(audio);
        this.beatsPlayer = new BeatsPlayer(audio);

        observeVisualizerSettings()
            .pipe(
                map((settings) => settings.coverArtAnimatedBackground),
                distinctUntilChanged(),
                tap((animatedBackground) => {
                    this.animatedBackground.hidden = this.hidden || !animatedBackground;
                })
            )
            .subscribe(logger);

        observeVisualizerSettings()
            .pipe(
                map((settings) => settings.coverArtBeats),
                distinctUntilChanged(),
                tap((beatsOverlay) => {
                    this.beatsPlayer.hidden = this.hidden || !beatsOverlay;
                })
            )
            .subscribe(logger);
    }

    get autoplay(): boolean {
        return this.beatsPlayer.autoplay;
    }

    set autoplay(autoplay: boolean) {
        this.animatedBackground.autoplay = autoplay;
        this.beatsPlayer.autoplay = autoplay;
    }

    get backgroundColor(): string {
        return this.animatedBackground.backgroundColor;
    }

    set backgroundColor(backgroundColor: string) {
        this.animatedBackground.backgroundColor = backgroundColor;
    }

    get beatsColor(): string {
        return this.beatsPlayer.color;
    }

    set beatsColor(color: string) {
        this.beatsPlayer.color = color;
    }

    get hidden(): boolean {
        return this.#hidden;
    }

    set hidden(hidden: boolean) {
        this.#hidden = hidden;
        this.animatedBackground.hidden = hidden || !visualizerSettings.coverArtAnimatedBackground;
        this.beatsPlayer.hidden = hidden || !visualizerSettings.coverArtBeats;
        if (this.element) {
            this.element.hidden = hidden;
        }
    }

    appendTo(element: HTMLElement): void {
        const beatsContainer = element.querySelector('.beats-player') as HTMLElement;
        if (beatsContainer) {
            element.hidden = this.hidden;
            this.element = element;
            this.beatsPlayer.appendTo(beatsContainer);
            this.animatedBackground.appendTo(element.querySelector('.animated-background')!);
        }
    }

    load(): void {
        this.animatedBackground.load();
        this.beatsPlayer.load();
    }

    play(): void {
        logger.log('play');
        if (visualizerSettings.coverArtAnimatedBackground) {
            this.animatedBackground.play();
        }
        if (visualizerSettings.coverArtBeats) {
            this.beatsPlayer.play();
        }
    }

    pause(): void {
        logger.log('pause');
        this.animatedBackground.pause();
        this.beatsPlayer.pause();
    }

    stop(): void {
        logger.log('stop');
        this.animatedBackground.stop();
        this.beatsPlayer.stop();
    }

    resize(width: number, height: number): void {
        this.animatedBackground.resize(width, height);
        this.beatsPlayer.resize(width);
    }
}
