import {EMPTY} from 'rxjs';
import {
    distinctUntilChanged,
    filter,
    map,
    skip,
    switchMap,
    tap,
    withLatestFrom,
} from 'rxjs/operators';
import Player from 'types/Player';
import {AmbientVideoVisualizer, WaveformVisualizer} from 'types/Visualizer';
import AbstractVisualizerPlayer from 'services/players/AbstractVisualizerPlayer';
import HTML5Player from 'services/players/HTML5Player';
import YouTubePlayer from 'services/youtube/YouTubePlayer';
import OmniPlayer from 'services/players/OmniPlayer';
import {LiteStorage, Logger} from 'utils';
import visualizerSettings, {observeVisualizerSettings} from '../visualizerSettings';
import beatsPlayer from './beatsPlayer';
import theme from 'services/theme';

const logger = new Logger('ambientVideoPlayer');

type ProgressRecord = Record<string, number | undefined>;

const html5Player = new HTML5Player('video', 'ambient');
const youtubePlayer = new YouTubePlayer('ambient');
const storage = new LiteStorage('ambientVideoPlayer');

function selectPlayer(visualizer: AmbientVideoVisualizer): Player<string> | null {
    if (visualizer) {
        if (visualizer.src.startsWith('youtube:')) {
            return youtubePlayer;
        }
        return html5Player;
    }
    return null;
}

function loadPlayer(player: Player<string>, visualizer: AmbientVideoVisualizer): void {
    const src = visualizer.src;
    if (src.startsWith('youtube:')) {
        const [, , videoId] = src.split(':');
        const key = getProgressKey();
        const progress = storage.getJson<ProgressRecord>(key, {});
        const startTime = progress[videoId] || (key === 'progress' ? 120 : 0);
        player.load(`${src}:${startTime}`);
    } else {
        player.load(src);
    }
}

function getProgressKey(): string {
    return visualizerSettings.useAmbientVideoSource && visualizerSettings.ambientVideoSource
        ? 'user-progress'
        : 'progress';
}

const videoPlayer = new OmniPlayer<AmbientVideoVisualizer, string>(
    'ambient-video-player',
    [html5Player, youtubePlayer, beatsPlayer as any],
    selectPlayer,
    loadPlayer
);

videoPlayer.loop = true;
videoPlayer.volume = 0;
videoPlayer.hidden = true;

export class AmbientVideoPlayer extends AbstractVisualizerPlayer<AmbientVideoVisualizer> {
    constructor(
        private readonly videoPlayer: Player<AmbientVideoVisualizer>,
        private readonly beatsPlayer: Player<WaveformVisualizer>
    ) {
        super();

        observeVisualizerSettings()
            .pipe(
                map((settings) => settings.beatsOverlay),
                distinctUntilChanged()
            )
            .subscribe((beatsOverlay) => {
                this.beatsPlayer.hidden = this.hidden || !beatsOverlay;
            });
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
        this.beatsPlayer.hidden = hidden || !visualizerSettings.beatsOverlay;
    }

    appendTo(parentElement: HTMLElement): void {
        this.videoPlayer.appendTo(parentElement);
    }

    load(visualizer: AmbientVideoVisualizer): void {
        this.videoPlayer.load(visualizer);
        if (this.autoplay && visualizerSettings.beatsOverlay) {
            this.beatsPlayer.play();
        }
    }

    play(): void {
        this.videoPlayer.play();
        if (visualizerSettings.beatsOverlay) {
            this.beatsPlayer.play();
        }
    }

    pause(): void {
        this.videoPlayer.pause();
        this.beatsPlayer.pause();
    }

    stop(): void {
        this.videoPlayer.stop();
        this.beatsPlayer.stop();
    }

    resize(width: number, height: number): void {
        this.videoPlayer.resize(width, height);
        const zoom = document.fullscreenElement ? 20 : 10;
        this.beatsPlayer.resize(theme.fontSize * zoom, theme.fontSize * zoom * 0.225);
    }
}

export default new AmbientVideoPlayer(videoPlayer, beatsPlayer);

youtubePlayer
    .observeVideoId()
    .pipe(
        switchMap((videoId) =>
            videoId
                ? youtubePlayer.observeCurrentTime().pipe(
                      map(Math.round),
                      distinctUntilChanged(),
                      filter((time) => time > 0 && time % 30 === 0),
                      withLatestFrom(youtubePlayer.observeDuration()),
                      filter(([, duration]) => duration > 600),
                      tap(([time]) => {
                          const key = getProgressKey();
                          const progress = storage.getJson<ProgressRecord>(key, {});
                          progress[videoId] = time;
                          storage.setJson(key, progress);
                      })
                  )
                : EMPTY
        )
    )
    .subscribe(logger);

observeVisualizerSettings()
    .pipe(
        map((settings) => settings.ambientVideoSource),
        distinctUntilChanged(),
        skip(1),
        tap(() => storage.removeItem('user-progress'))
    )
    .subscribe(logger);
