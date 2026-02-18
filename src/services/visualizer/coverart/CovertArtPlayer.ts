import {combineLatest, distinctUntilChanged, map, tap} from 'rxjs';
import AudioManager from 'types/AudioManager';
import PlaylistItem from 'types/PlaylistItem';
import {CoverArtVisualizer} from 'types/Visualizer';
import {Logger} from 'utils';
import {observeAudioSettings} from 'services/audio';
import {observeCurrentItem} from 'services/playlist';
import {isProviderSupported} from '../visualizer';
import AbstractVisualizerPlayer from '../AbstractVisualizerPlayer';
import visualizerSettings, {observeVisualizerSettings} from '../visualizerSettings';
import BeatsPlayer from '../waveform/BeatsPlayer';
import AnimatedBackgroundPlayer from './AnimatedBackgroundPlayer';

const logger = new Logger('CovertArtPlayer');

export default class CovertArtPlayer extends AbstractVisualizerPlayer<CoverArtVisualizer> {
    private readonly animatedBackground: AnimatedBackgroundPlayer;
    private readonly beatsPlayer: BeatsPlayer;
    private beatsPauseTimer = 0;
    hidden = true;

    constructor(audio: AudioManager) {
        super();

        this.animatedBackground = new AnimatedBackgroundPlayer(audio);
        this.beatsPlayer = new BeatsPlayer(audio);

        observeVisualizerSettings()
            .pipe(
                map((settings) => settings.coverArtAnimatedBackground),
                distinctUntilChanged(),
                tap((animatedBackground) => {
                    this.animatedBackground.hidden = !animatedBackground;
                })
            )
            .subscribe(logger);

        combineLatest([observeCurrentItem(), observeVisualizerSettings(), observeAudioSettings()])
            .pipe(
                map(([currentItem]) => this.canShowBeats(currentItem)),
                distinctUntilChanged(),
                tap((canShowBeats) => {
                    this.beatsPlayer.hidden = !canShowBeats;
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

    get backgroundColor2(): string {
        return this.animatedBackground.color;
    }

    set backgroundColor2(color: string) {
        this.animatedBackground.color = color;
    }

    get beatsColor(): string {
        return this.beatsPlayer.beatsColor;
    }

    set beatsColor(color: string) {
        this.beatsPlayer.beatsColor = color;
    }

    get waveColor(): string {
        return this.beatsPlayer.waveColor;
    }

    set waveColor(color: string) {
        this.beatsPlayer.waveColor = color;
    }

    appendTo(element: HTMLElement): void {
        const animatedBackgroundElement =
            element.querySelector<HTMLElement>('.animated-background');
        if (animatedBackgroundElement) {
            this.animatedBackground.appendTo(animatedBackgroundElement);
        }
        const beatsElement = element.querySelector<HTMLElement>('.beats-player');
        if (beatsElement) {
            this.beatsPlayer.appendTo(beatsElement);
        }
    }

    load(): void {
        this.animatedBackground.load();
        this.beatsPlayer.load();
    }

    play(): void {
        logger.log('play');
        clearTimeout(this.beatsPauseTimer);
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
        // Don't pause the animation until it has faded out.
        this.beatsPauseTimer = setTimeout(() => this.beatsPlayer.pause(), 3_000) as any;
    }

    stop(): void {
        logger.log('stop');
        clearTimeout(this.beatsPauseTimer);
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
