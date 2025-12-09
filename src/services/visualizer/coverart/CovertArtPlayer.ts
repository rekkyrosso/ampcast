import {combineLatest, distinctUntilChanged, map, tap} from 'rxjs';
import AudioManager from 'types/AudioManager';
import PlaylistItem from 'types/PlaylistItem';
import {CoverArtVisualizer} from 'types/Visualizer';
import {Logger} from 'utils';
import {observeAudioSettings} from 'services/audio';
import {getCurrentItem, observeCurrentItem} from 'services/playlist';
import {isProviderSupported} from '../visualizer';
import AbstractVisualizerPlayer from '../AbstractVisualizerPlayer';
import visualizerSettings, {observeVisualizerSettings} from '../visualizerSettings';
import BeatsPlayer from '../waveform/BeatsPlayer';
import AnimatedBackgroundPlayer from './AnimatedBackgroundPlayer';

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

        combineLatest([observeCurrentItem(), observeVisualizerSettings(), observeAudioSettings()])
            .pipe(
                map(([currentItem]) => this.canShowBeats(currentItem)),
                distinctUntilChanged(),
                tap((canShowBeats) => {
                    this.beatsPlayer.hidden = this.hidden || !canShowBeats;
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

    get color(): string {
        return this.animatedBackground.color;
    }

    set color(color: string) {
        this.animatedBackground.color = color;
    }

    get hidden(): boolean {
        return this.#hidden;
    }

    set hidden(hidden: boolean) {
        this.#hidden = hidden;
        this.animatedBackground.hidden = hidden || !visualizerSettings.coverArtAnimatedBackground;
        this.beatsPlayer.hidden = hidden || !this.canShowBeats(getCurrentItem());
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

    private canShowBeats(currentItem: PlaylistItem | null): boolean {
        return (
            !!currentItem &&
            visualizerSettings.coverArtBeats &&
            isProviderSupported('waveform', currentItem)
        );
    }
}
