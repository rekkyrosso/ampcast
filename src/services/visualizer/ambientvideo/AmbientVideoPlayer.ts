import type {Observable} from 'rxjs';
import {EMPTY, distinctUntilChanged, filter, map, skip, switchMap, tap, withLatestFrom} from 'rxjs';
import AudioManager from 'types/AudioManager';
import PlayableItem from 'types/PlayableItem';
import Player from 'types/Player';
import {AmbientVideoVisualizer} from 'types/Visualizer';
import AbstractVisualizerPlayer from 'services/players/AbstractVisualizerPlayer';
import HTML5Player from 'services/players/HTML5Player';
import YouTubePlayer from 'services/youtube/YouTubePlayer';
import OmniPlayer from 'services/players/OmniPlayer';
import {LiteStorage, Logger} from 'utils';
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

        observeVisualizerSettings()
            .pipe(
                map((settings) => settings.ambientVideoBeats),
                distinctUntilChanged(),
                tap((beatsOverlay) => {
                    this.beatsPlayer.hidden = this.hidden || !beatsOverlay;
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
        this.beatsPlayer.hidden = hidden || !visualizerSettings.ambientVideoBeats;
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
        logger.log('play');
        this.videoPlayer.play();
        if (visualizerSettings.ambientVideoBeats) {
            this.beatsPlayer.play();
        }
    }

    pause(): void {
        logger.log('pause');
        this.videoPlayer.pause();
        this.beatsPlayer.pause();
    }

    stop(): void {
        logger.log('stop');
        this.videoPlayer.stop();
        this.beatsPlayer.stop();
    }

    resize(width: number, height: number): void {
        this.videoPlayer.resize(width, height);
        this.beatsPlayer.resize(width);
    }

    private createVideoPlayer(beatsPlayer: Player<any>): Player<PlayableItem> {
        const html5Player = new HTML5Player('video', 'ambient');
        const youtubePlayer = this.createYouTubePlayer();

        const selectPlayer = (visualizer: AmbientVideoVisualizer): Player<PlayableItem> | null => {
            if (visualizer) {
                if (visualizer.src.startsWith('youtube:')) {
                    return youtubePlayer;
                }
                return html5Player;
            }
            return null;
        };

        const loadPlayer = (
            player: Player<PlayableItem>,
            visualizer: AmbientVideoVisualizer
        ): void => {
            const src = visualizer.src;
            if (src.startsWith('youtube:')) {
                const [, , videoId] = src.split(':');
                const key = this.getProgressKey();
                const progress = this.storage.getJson<ProgressRecord>(key, {});
                const startTime = progress[videoId] || (key === 'progress' ? 120 : 0);
                player.load({src: `${src}:${startTime}`});
            } else {
                player.load({src});
            }
        };

        const videoPlayer = new OmniPlayer<AmbientVideoVisualizer, PlayableItem>(
            'ambient-video-player',
            selectPlayer,
            loadPlayer
        );

        videoPlayer.loop = true;
        videoPlayer.volume = 0;
        videoPlayer.hidden = true;

        // Register the beats player so that it gets appended to the DOM.
        // But we don't really want it controlled after that.
        videoPlayer.registerPlayers([html5Player, youtubePlayer, beatsPlayer]);
        videoPlayer.unregisterPlayers([beatsPlayer]);

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

    private getProgressKey(): string {
        return visualizerSettings.useAmbientVideoSource && visualizerSettings.ambientVideoSource
            ? 'user-progress'
            : 'progress';
    }
}
