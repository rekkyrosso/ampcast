import type {Observable} from 'rxjs';
import {
    EMPTY,
    combineLatest,
    distinctUntilChanged,
    filter,
    map,
    skip,
    switchMap,
    tap,
    withLatestFrom,
} from 'rxjs';
import AudioManager from 'types/AudioManager';
import PlayableItem from 'types/PlayableItem';
import PlaylistItem from 'types/PlaylistItem';
import Player from 'types/Player';
import {AmbientVideoVisualizer} from 'types/Visualizer';
import HTML5Player from 'services/mediaPlayback/players/HTML5Player';
import {getCurrentItem, observeCurrentItem} from 'services/playlist';
import YouTubePlayer from 'services/youtube/YouTubePlayer';
import OmniPlayer from 'services/mediaPlayback/players/OmniPlayer';
import {LiteStorage, Logger} from 'utils';
import {isProviderSupported} from '../visualizer';
import AbstractVisualizerPlayer from '../AbstractVisualizerPlayer';
import visualizerSettings, {observeVisualizerSettings} from '../visualizerSettings';
import BeatsPlayer from '../waveform/BeatsPlayer';

const logger = new Logger('AmbientVideoPlayer');

type ProgressRecord = Record<string, number | undefined>;

export default class AmbientVideoPlayer extends AbstractVisualizerPlayer<AmbientVideoVisualizer> {
    private readonly storage = new LiteStorage('ambientVideoPlayer');
    private readonly videoPlayer: Player<AmbientVideoVisualizer>;
    private readonly beatsPlayer: BeatsPlayer;

    constructor(audio: AudioManager) {
        super();

        this.beatsPlayer = new BeatsPlayer(audio);
        this.videoPlayer = this.createVideoPlayer(this.beatsPlayer);

        combineLatest([observeVisualizerSettings(), observeCurrentItem()])
            .pipe(
                map(([, currentItem]) => this.canShowBeats(currentItem)),
                distinctUntilChanged(),
                tap((canShowBeats) => {
                    this.beatsPlayer.hidden = this.hidden || !canShowBeats;
                })
            )
            .subscribe(logger);

        observeVisualizerSettings()
            .pipe(
                map((settings) => settings.ambientVideoSource),
                distinctUntilChanged(),
                skip(1),
                tap(() => this.storage.removeItem('user-progress'))
            )
            .subscribe(logger);
    }

    get autoplay(): boolean {
        return this.videoPlayer.autoplay;
    }

    set autoplay(autoplay: boolean) {
        this.videoPlayer.autoplay = autoplay;
        this.beatsPlayer.autoplay = autoplay;
    }

    get hidden(): boolean {
        return this.videoPlayer.hidden;
    }

    set hidden(hidden: boolean) {
        this.videoPlayer.hidden = hidden;
        this.beatsPlayer.hidden = hidden || !this.canShowBeats(getCurrentItem());
    }

    observeCurrentTime(): Observable<number> {
        return this.videoPlayer.observeCurrentTime();
    }

    observeDuration(): Observable<number> {
        return this.videoPlayer.observeDuration();
    }

    observeEnded(): Observable<void> {
        return this.videoPlayer.observeEnded();
    }

    observeError(): Observable<unknown> {
        return this.videoPlayer.observeError();
    }

    observePlaying(): Observable<void> {
        return this.videoPlayer.observePlaying();
    }

    appendTo(parentElement: HTMLElement): void {
        this.videoPlayer.appendTo(parentElement);
    }

    load(visualizer: AmbientVideoVisualizer): void {
        this.videoPlayer.load(visualizer);
        this.beatsPlayer.load();
    }

    play(): void {
        this.videoPlayer.play();
        if (visualizerSettings.ambientVideoBeats) {
            this.beatsPlayer.play();
        }
    }

    pause(): void {
        this.videoPlayer.pause();
        this.beatsPlayer.pause();
    }

    stop(): void {
        this.videoPlayer.pause();
        this.beatsPlayer.stop();
    }

    resize(width: number, height: number): void {
        this.videoPlayer.resize(width, height);
        this.beatsPlayer.resize(width);
    }

    private createVideoPlayer(beatsPlayer: Player<any>): Player<AmbientVideoVisualizer> {
        const html5Player = new HTML5Player('video', 'ambient');
        const youtubePlayer = this.createYouTubePlayer();

        const mapVideoSrc = ({video}: AmbientVideoVisualizer): PlayableItem => {
            const src = video.src;
            if (src.startsWith('youtube:')) {
                const [, , videoId] = src.split(':');
                const key = this.getProgressKey();
                const progress = this.storage.getJson<ProgressRecord>(key, {});
                const startTime = progress[videoId] || (key === 'progress' ? 120 : 0);
                return {src, startTime};
            } else {
                return video;
            }
        };

        const videoPlayer = new OmniPlayer<AmbientVideoVisualizer, PlayableItem>(
            'ambientVideoPlayer',
            mapVideoSrc
        );

        videoPlayer.loop = true;
        videoPlayer.volume = 0;
        videoPlayer.hidden = true;

        // Register the beats player so that it gets appended to the DOM.
        // But we don't really want it controlled after that.
        videoPlayer.registerPlayers(
            // These selectors get evaluated in reverse order.
            // So put defaults first.
            [
                [html5Player, (item) => !!item],
                [youtubePlayer, (item) => !!item?.video.src.startsWith('youtube:')],
                [beatsPlayer, () => false],
            ]
        );
        videoPlayer.unregisterPlayer(beatsPlayer);

        return videoPlayer;
    }

    private createYouTubePlayer(): YouTubePlayer {
        const youtubePlayer = new YouTubePlayer('ambient');

        // Track progress of ambient YouTube videos so that they don't become boring.
        youtubePlayer
            .observeVideoId()
            .pipe(
                switchMap((videoId) =>
                    videoId
                        ? youtubePlayer.observeCurrentTime().pipe(
                              map(Math.round),
                              distinctUntilChanged(),
                              // Update storage every 20 seconds
                              filter((time) => time > 0 && time % 20 === 0),
                              withLatestFrom(youtubePlayer.observeDuration()),
                              // Don't bother for short videos
                              filter(([, duration]) => duration > 120),
                              tap(([time]) => {
                                  const key = this.getProgressKey();
                                  const progress = this.storage.getJson<ProgressRecord>(key, {});
                                  progress[videoId] = time;
                                  this.storage.setJson(key, progress);
                              })
                          )
                        : EMPTY
                )
            )
            .subscribe(logger);

        return youtubePlayer;
    }

    private canShowBeats(currentItem: PlaylistItem | null): boolean {
        return (
            !!currentItem &&
            visualizerSettings.ambientVideoBeats &&
            isProviderSupported('waveform', currentItem)
        );
    }

    private getProgressKey(): string {
        return visualizerSettings.useAmbientVideoSource && visualizerSettings.ambientVideoSource
            ? 'user-progress'
            : 'progress';
    }
}
