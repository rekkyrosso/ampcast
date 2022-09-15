import type {Observable} from 'rxjs';
import {distinctUntilChanged, EMPTY, filter, map, switchMap} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import {interpolateBasis} from 'd3-interpolate';
import {min} from 'd3-array';
import {scaleLog} from 'd3-scale';
import SimpleAudioAnalyser from 'types/SimpleAudioAnalyser';
import {observePaused} from 'services/mediaPlayback/playback';
// import Logger from 'utils/Logger';
import spotifyPlayer, {SpotifyPlayer} from './spotifyPlayer';
import {spotifyApi} from './spotify';

// const logger = new Logger('spotifyAudioAnalyser');

// Based on: https://github.com/zachwinter/spotify-viz/blob/master/client/classes/sync.js

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

const frequencyTable = [
    [16.35],
    [17.32],
    [18.35],
    [19.45],
    [20.6],
    [21.83],
    [23.12],
    [24.5],
    [25.96],
    [27.5],
    [29.14],
    [30.87],
];

frequencyTable.forEach((range) => {
    const note = range[0];
    for (let i = 1; i < 12; i++) {
        range[i] = note * 2 ** i;
    }
});

export class SpotifyAudioAnalyser implements SimpleAudioAnalyser {
    private readonly intervalTypes: IntervalType[] = [
        'bars',
        'beats',
        'sections',
        'segments',
        'tatums',
    ];
    private animationFrameId = 0;
    private currentTrackId = '';
    private currentTrackAnalysis: SpotifyApi.AudioAnalysisObject | null = null;
    private trackAnalysis = {} as SpotifyApi.AudioAnalysisObject & ActiveIntervals;
    private initialTrackProgress = 0;
    private initialStart = 0;
    private trackProgress = 0;
    private active = false;
    private queues: {
        volume: number[];
        beat: number[];
    } = {
        volume: [],
        beat: [],
    };
    private activeIntervals$ = new BehaviorSubject<ActiveIntervals>({
        bars: {},
        beats: {},
        sections: {},
        segments: {},
        tatums: {},
    } as ActiveIntervals);
    public fftSize = 2048;
    public volumeSmoothing = 100;
    #volume = 0;

    constructor(spotifyPlayer: SpotifyPlayer) {
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

                this.active =
                    !!this.currentTrackAnalysis && !!state && !state.paused && !state.loading;

                if (this.active) {
                    this.start();
                } else {
                    this.stop();
                }
            });
    }

    get bar(): ActiveIntervals['bars'] {
        return this.activeIntervals.bars;
    }

    get beat(): ActiveIntervals['beats'] {
        return this.activeIntervals.beats;
    }

    get frequencyBinCount(): number {
        return this.fftSize / 2;
    }

    get section(): ActiveIntervals['sections'] {
        return this.activeIntervals.sections;
    }

    get segment(): ActiveIntervals['segments'] {
        return this.activeIntervals.segments;
    }

    get tatum(): ActiveIntervals['tatums'] {
        return this.activeIntervals.tatums;
    }

    get volume(): number {
        return this.#volume;
    }

    observeBar(): Observable<ActiveIntervals['bars']> {
        return this.observeActiveIntervals().pipe(
            map((activeIntervals) => activeIntervals['bars']),
            distinctUntilChanged()
        );
    }

    observeBeat(): Observable<ActiveIntervals['beats']> {
        return this.observeActiveIntervals().pipe(
            map((activeIntervals) => activeIntervals['beats']),
            distinctUntilChanged()
        );
    }

    observeSection(): Observable<ActiveIntervals['sections']> {
        return this.observeActiveIntervals().pipe(
            map((activeIntervals) => activeIntervals['sections']),
            distinctUntilChanged()
        );
    }

    observeSegment(): Observable<ActiveIntervals['segments']> {
        return this.observeActiveIntervals().pipe(
            map((activeIntervals) => activeIntervals['segments']),
            distinctUntilChanged()
        );
    }

    observeTatum(): Observable<ActiveIntervals['tatums']> {
        return this.observeActiveIntervals().pipe(
            map((activeIntervals) => activeIntervals['tatums']),
            distinctUntilChanged()
        );
    }

    getByteFrequencyData(array: Uint8Array): void {
        if (!this.active) {
            return;
        }

        const pitches = this.segment.pitches;

        if (pitches) {
            const beat = interpolateBasis([0, this.volume, 0])(this.beat.progress);
            const bufferSize = this.frequencyBinCount;
            for (let i = 0; i < bufferSize; i++) {
                const sample = this.samplePitches(pitches, i);
                // logger.log({i, sample});
                array[i] = sample * beat * 256;
            }
        }

        // if (pitches) {
        //     const beat = interpolateBasis([0, this.volume, 0])(this.beat.progress);
        //     const brightness = this.segment.timbre[1];
        //     const centre = brightness / 360;
        //     const bufferSize = this.frequencyBinCount;
        //     // logger.log({beat, brightness});
        //     for (let i = 0; i < bufferSize; i++) {
        //         let radian = (i - bufferSize / 2 - centre * bufferSize) / bufferSize + 1;
        //         if (radian < 0 || radian > 2) {
        //             radian = 0;
        //         }
        //         array[i] = 255 * Math.sin(radian * (Math.PI / 2)) * beat;
        //     }
        // }
    }

    private samplePitches(pitches: number[], sample: number): number {
        const sampleSize = this.sampleSize;
        const min = sample * sampleSize;
        const max = min + sampleSize;
        let total = 0;
        for (let i = 0; i < 12; i++) {
            for (let j = 0; j < 12; j++) {
                const frequency = frequencyTable[i][j];
                if (frequency >= min && frequency < max) {
                    total += pitches[i];
                    break;
                }
            }
        }
        return total;
    }

    getByteTimeDomainData(array: Uint8Array): void {
        array.fill(128);
    }

    private get activeIntervals(): ActiveIntervals {
        return this.activeIntervals$.getValue();
    }

    private get sampleSize(): number {
        return 24_000 / this.frequencyBinCount;
    }

    private observeActiveIntervals(): Observable<ActiveIntervals> {
        return observePaused().pipe(
            switchMap((paused) => (paused ? EMPTY : this.activeIntervals$)),
            filter(() => this.active)
        );
    }

    private async updateState(state: Spotify.PlaybackState): Promise<void> {
        this.trackAnalysis = JSON.parse(JSON.stringify(this.currentTrackAnalysis));

        this.intervalTypes.forEach((t: IntervalType) => {
            const type = this.trackAnalysis[t];
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

        this.initialTrackProgress = state.position;
        this.trackProgress = state.position;
        this.initialStart = window.performance.now();
    }

    private setActiveIntervals(): void {
        const activeIntervals = this.activeIntervals;

        const easeOutQuart = (t: number): number => {
            t = Math.min(Math.max(0, t), 1);
            return 1 - --t * t * t * t;
        };

        const determineInterval = (type: IntervalType): number => {
            const analysis = this.trackAnalysis[type];
            const progress = this.trackProgress;
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

        this.intervalTypes.forEach((type: IntervalType) => {
            const index = determineInterval(type);
            if (activeIntervals[type].start == null || index !== activeIntervals[type].index) {
                activeIntervals[type] = <any>{
                    ...this.trackAnalysis[type][index],
                    index,
                };
            }
            const {start, duration} = activeIntervals[type];
            const elapsed = this.trackProgress - start;
            activeIntervals[type].elapsed = elapsed;
            activeIntervals[type].progress = easeOutQuart(elapsed / duration);
        });

        this.activeIntervals$.next(activeIntervals);
    }

    private getVolume(): number {
        const {loudness_max, loudness_start, loudness_max_time, duration, elapsed, start, index} =
            this.activeIntervals.segments;

        if (!this.trackAnalysis.segments[index + 1]) {
            return 0;
        }

        const next = this.trackAnalysis.segments[index + 1].loudness_start;
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

    private start(): void {
        if (!this.animationFrameId) {
            this.animationFrameId = requestAnimationFrame(this.tick.bind(this));
        }
    }

    private stop(): void {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = 0;
        }
    }

    private tick(now: number): void {
        this.animationFrameId = requestAnimationFrame(this.tick.bind(this));
        if (!this.active) {
            return;
        }

        /** Set track progress and active intervals. */
        this.trackProgress = now - this.initialStart + this.initialTrackProgress;
        this.setActiveIntervals();

        /** Get current volume. */
        const volume = this.getVolume();
        const queues = this.queues;

        /** Add volume value to the beginning of the volume queue. */
        queues.volume.unshift(volume);

        /** If the queue is larger than 400 values, remove the last value. */
        if (queues.volume.length > 400) {
            queues.volume.pop();
        }

        /** Add volume value to the beginning of the beat queue. */
        queues.beat.unshift(volume);

        /** If the queue is larger than our defined smoothing value, remove the last value. */
        if (queues.beat.length > this.volumeSmoothing) {
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
        this.#volume = sizeScale(beat);
    }

    private interpolate(a: number, b: number): (t: number) => number {
        return (t: number): number => a * (1 - t) + b * t;
    }

    private isSegment(segment: any): segment is SpotifyApi.AudioAnalysisSegment {
        return 'loudness_max_time' in segment;
    }
}

export default new SpotifyAudioAnalyser(spotifyPlayer);
