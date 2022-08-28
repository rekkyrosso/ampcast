import Observe, {Observable} from './util/observe';
import {scaleLog} from 'd3-scale';
import {min} from 'd3-array';
import {spotifyApi, spotifyPlayer} from 'services/spotify';

type IntervalType = 'bars' | 'beats' | 'sections' | 'segments' | 'tatums';

export interface ActiveInterval {
    progress: number;
    elapsed: number;
    index: number;
}

export interface ActiveIntervals {
    bars: SpotifyApi.AudioAnalysisIntervalObject & ActiveInterval;
    beats: SpotifyApi.AudioAnalysisIntervalObject & ActiveInterval;
    sections: SpotifyApi.AudioAnalysisSection & ActiveInterval;
    segments: SpotifyApi.AudioAnalysisSegment & ActiveInterval;
    tatums: SpotifyApi.AudioAnalysisIntervalObject & ActiveInterval;
}

export interface SyncState {
    intervalTypes: IntervalType[];
    activeIntervals: Observable<ActiveIntervals>;
    trackAnalysis: SpotifyApi.AudioAnalysisObject & ActiveIntervals;
    initialTrackProgress: number;
    initialStart: number;
    trackProgress: number;
    active: boolean;
    volumeSmoothing: number;
    volume: number;
    queues: {
        volume: number[];
        beat: number[];
    };
}

export interface SyncData {
    readonly bar: ActiveIntervals['bars'];
    readonly beat: ActiveIntervals['beats'];
    readonly section: ActiveIntervals['sections'];
    readonly segment: ActiveIntervals['segments'];
    readonly tatum: ActiveIntervals['tatums'];
    readonly volume: number;
}

interface Hooks {
    bar: (bar: ActiveIntervals['bars']) => void;
    beat: (beat: ActiveIntervals['beats']) => void;
    section: (section: ActiveIntervals['sections']) => void;
    segment: (tatum: ActiveIntervals['segments']) => void;
    tatum: (tatum: ActiveIntervals['tatums']) => void;
}

export default class Sync {
    private animationFrameId = 0;
    private currentTrackId = '';
    private currentTrackAnalysis: SpotifyApi.AudioAnalysisObject | null = null;
    private state: Observable<SyncState>;
    private hooks: Hooks = {
        bar: () => undefined,
        beat: () => undefined,
        section: () => undefined,
        segment: () => undefined,
        tatum: () => undefined,
    };
    public volume = 0;

    constructor({volumeSmoothing = 100} = {}) {
        this.state = Observe({
            intervalTypes: ['bars', 'beats', 'sections', 'segments', 'tatums'],
            activeIntervals: Observe({
                bars: {},
                beats: {},
                sections: {},
                segments: {},
                tatums: {},
            }),
            trackAnalysis: {},
            initialTrackProgress: 0,
            initialStart: 0,
            trackProgress: 0,
            active: false,
            initialized: false,
            volumeSmoothing,
            volume: 0,
            queues: {
                volume: [],
                beat: [],
            },
        });

        spotifyPlayer
            .observeCurrentTrackState()
            .subscribe(async (state: Spotify.PlaybackState | null) => {
                const trackId = state?.track_window?.current_track?.id;
                if (trackId && this.currentTrackId !== trackId) {
                    this.currentTrackId = trackId;
                    this.currentTrackAnalysis = null;
                    try {
                        this.currentTrackAnalysis = await spotifyApi.getAudioAnalysisForTrack(
                            trackId
                        );
                        state = await spotifyPlayer.getCurrentState();
                    } catch (err) {
                        console.error(err);
                        this.currentTrackAnalysis = null;
                        state = null;
                    }
                }
                if (state && this.currentTrackAnalysis) {
                    this.updateState(state);
                }
                const active =
                    !!this.currentTrackAnalysis && !!state && !state.paused && !state.loading;
                if (this.state.active !== active) {
                    this.state.active = active;
                }
            });

        this.initHooks();
    }

    get data(): SyncData {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const sync = this;
        return {
            get tatum(): ActiveIntervals['tatums'] {
                return sync.state.activeIntervals.tatums;
            },

            get segment(): ActiveIntervals['segments'] {
                return sync.state.activeIntervals.segments;
            },

            get beat(): ActiveIntervals['beats'] {
                return sync.state.activeIntervals.beats;
            },

            get bar(): ActiveIntervals['bars'] {
                return sync.state.activeIntervals.bars;
            },

            get section(): ActiveIntervals['sections'] {
                return sync.state.activeIntervals.sections;
            },

            get volume(): number {
                return sync.volume;
            },
        };
    }

    get volumeSmoothing(): number {
        return this.state.volumeSmoothing;
    }

    set volumeSmoothing(volumeSmoothing) {
        this.state.volumeSmoothing = volumeSmoothing;
    }

    /**
     * @method initHooks - Initialize interval event hooks.
     */
    private initHooks(): void {
        this.state.activeIntervals.watch('bars', (bar: ActiveIntervals['bars']) => {
            this.hooks.bar(bar);
        });
        this.state.activeIntervals.watch('beats', (beat: ActiveIntervals['beats']) => {
            this.hooks.beat(beat);
        });
        this.state.activeIntervals.watch('sections', (section: ActiveIntervals['sections']) => {
            this.hooks.section(section);
        });
        this.state.activeIntervals.watch('segments', (segment: ActiveIntervals['segments']) => {
            this.hooks.segment(segment);
        });
        this.state.activeIntervals.watch('tatums', (tatum: ActiveIntervals['tatums']) => {
            this.hooks.tatum(tatum);
        });
    }

    /**
     * @method getTrackInfo - Fetch track analysis and track features of currently playing track.
     * @param {object} state - Response from Spotify API.
     */
    private async updateState(state: Spotify.PlaybackState): Promise<void> {
        this.state.trackAnalysis = JSON.parse(JSON.stringify(this.currentTrackAnalysis));

        this.state.intervalTypes.forEach((t: IntervalType) => {
            const type = this.state.trackAnalysis[t];
            type[0].duration = type[0].start + type[0].duration;
            type[0].start = 0;
            // type[type.length - 1].duration = state.duration / 1000 - type[type.length - 1].start;
            type.forEach((interval) => {
                if (this.isSegment(interval)) {
                    interval.loudness_max_time = interval.loudness_max_time * 1000;
                }
                interval.start = (interval.start || 0) * 1000;
                interval.duration = (interval.duration || 0) * 1000;
            });
        });

        this.state.initialTrackProgress = state.position;
        this.state.trackProgress = state.position;
        this.state.initialStart = window.performance.now();
    }

    private setActiveIntervals(): void {
        const easeOutQuart = (t: number): number => {
            t = Math.min(Math.max(0, t), 1);
            return 1 - --t * t * t * t;
        };

        const determineInterval = (type: IntervalType): number => {
            const analysis = this.state.trackAnalysis[type];
            const progress = this.state.trackProgress;
            for (let i = 0; i < analysis.length; i++) {
                if (i === analysis.length - 1) {
                    return i;
                }
                if (analysis[i].start < progress && progress < analysis[i + 1].start) {
                    return i;
                }
            }
            return 0;
        };

        this.state.intervalTypes.forEach((type: IntervalType) => {
            const index = determineInterval(type);
            if (
                this.state.activeIntervals[type].start == null ||
                index !== this.state.activeIntervals[type].index
            ) {
                this.state.activeIntervals[type] = <any>{
                    ...this.state.trackAnalysis[type][index],
                    index,
                };
            }

            const {start, duration} = this.state.activeIntervals[type];
            const elapsed = this.state.trackProgress - start;
            this.state.activeIntervals[type].elapsed = elapsed;
            this.state.activeIntervals[type].progress = easeOutQuart(elapsed / duration);
        });
    }

    private getVolume(): number {
        const {loudness_max, loudness_start, loudness_max_time, duration, elapsed, start, index} =
            this.state.activeIntervals.segments;

        if (!this.state.trackAnalysis.segments[index + 1]) {
            return 0;
        }

        const next = this.state.trackAnalysis.segments[index + 1].loudness_start;
        const current = start + elapsed;

        if (elapsed < loudness_max_time) {
            const progress = Math.min(1, elapsed / loudness_max_time);
            return this.interpolate(loudness_start, loudness_max)(progress);
        } else {
            const _start = start + loudness_max_time;
            const _elapsed = current - _start;
            const _duration = duration - loudness_max_time;
            const progress = Math.min(1, _elapsed / _duration);
            return this.interpolate(loudness_max, next)(progress);
        }
    }

    start(): void {
        if (!this.animationFrameId) {
            this.animationFrameId = requestAnimationFrame(this.tick.bind(this));
        }
    }

    stop(): void {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = 0;
        }
    }

    watch<K extends keyof SyncState>(key: K, method: (value: SyncState[K]) => void): void {
        this.state.watch(key, method);
    }

    on<K extends keyof Hooks>(interval: K, method: Hooks[K]): void {
        this.hooks[interval] = method;
    }

    get isActive(): boolean {
        return this.state.active === true;
    }

    private tick(now: number): void {
        this.animationFrameId = requestAnimationFrame(this.tick.bind(this));
        if (!this.state.active) {
            return;
        }

        /** Set track progress and active intervals. */
        this.state.trackProgress = now - this.state.initialStart + this.state.initialTrackProgress;
        this.setActiveIntervals();

        /** Get current volume. */
        const volume = this.getVolume();
        const queues = this.state.queues;

        /** Add volume value to the beginning of the volume queue. */
        queues.volume.unshift(volume);

        /** If the queue is larger than 400 values, remove the last value. */
        if (queues.volume.length > 400) {
            queues.volume.pop();
        }

        /** Add volume value to the beginning of the beat queue. */
        queues.beat.unshift(volume);

        /** If the queue is larger than our defined smoothing value, remove the last value. */
        if (queues.beat.length > this.state.volumeSmoothing) {
            queues.beat.pop();
        }

        function average(arr: number[]): number {
            return arr.reduce((a, b) => a + b) / arr.length;
        }

        /** Scale volume (dB) to a linear range using the minimum and average values of the volume queue. */
        const sizeScale = scaleLog()
            .domain([min(queues.volume)!, average(queues.volume)])
            .range([0, 1]);

        /** Average the beat queue, then pass it to our size scale. */
        const beat = average(queues.beat);
        this.volume = sizeScale(beat);
    }

    private interpolate(a: number, b: number): (t: number) => number {
        return (t: number): number => a * (1 - t) + b * t;
    }

    private isSegment(segment: any): segment is SpotifyApi.AudioAnalysisSegment {
        return 'loudness_max_time' in segment;
    }
}
