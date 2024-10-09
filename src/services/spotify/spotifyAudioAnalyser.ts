import type {Observable} from 'rxjs';
import {
    EMPTY,
    BehaviorSubject,
    concatMap,
    distinctUntilChanged,
    filter,
    map,
    switchMap,
} from 'rxjs';
import {interpolateBasis, interpolateNumber} from 'd3-interpolate';
import {min} from 'd3-array';
import {scaleLog} from 'd3-scale';
import {InvFFT as ifft} from 'jsfft';
import {observePaused} from 'services/mediaPlayback/playback';
import type {SpotifyPlayer} from './spotifyPlayer';
import spotifyApi from './spotifyApi';
import {samplePitches} from './samplePitches';
import {clamp, Logger} from 'utils';

const logger = new Logger('spotifyAudioAnalyser');

// This repo has since been deleted but I'll leave the link here anyway.
// Based on: https://github.com/zachwinter/spotify-viz/blob/master/client/classes/sync.js

type SimpleAudioAnalyser = Pick<
    AnalyserNode,
    | 'getByteFrequencyData'
    | 'getByteTimeDomainData'
    | 'getFloatFrequencyData'
    | 'getFloatTimeDomainData'
>;

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

export class SpotifyAudioAnalyser implements SimpleAudioAnalyser {
    private readonly maxDecibels = -30;
    private readonly minDecibels = -100;
    private readonly volumeSmoothing = 10;
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
    private trackAnalysis: (SpotifyApi.AudioAnalysisObject & ActiveIntervals) | null = null;
    private initialTrackProgress = 0;
    private initialStart = 0;
    private trackProgress = 0;
    private active = false;
    private queues: {
        volume: number[];
        beat: number[];
    } = {
        volume: [0],
        beat: [0],
    };
    private readonly activeIntervals$ = new BehaviorSubject<ActiveIntervals>({
        bars: {},
        beats: {},
        sections: {},
        segments: {},
        tatums: {},
    } as ActiveIntervals);
    #player: SpotifyPlayer | undefined;
    #volume = 0;

    get bar(): ActiveIntervals['bars'] {
        return this.activeIntervals.bars;
    }

    get beat(): ActiveIntervals['beats'] {
        return this.activeIntervals.beats;
    }

    get player(): SpotifyPlayer | undefined {
        return this.#player;
    }

    set player(player: SpotifyPlayer | undefined) {
        this.#player = player;
        player
            ?.observeCurrentTrackState()
            .pipe(concatMap((state) => this.updateTrackAnalysis(state)))
            .subscribe(logger);
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
        return this.observeActiveInterval('bars') as Observable<ActiveIntervals['bars']>;
    }

    observeBeat(): Observable<ActiveIntervals['beats']> {
        return this.observeActiveInterval('beats') as Observable<ActiveIntervals['beats']>;
    }

    observeSection(): Observable<ActiveIntervals['sections']> {
        return this.observeActiveInterval('sections') as Observable<ActiveIntervals['sections']>;
    }

    observeSegment(): Observable<ActiveIntervals['segments']> {
        return this.observeActiveInterval('segments') as Observable<ActiveIntervals['segments']>;
    }

    observeTatum(): Observable<ActiveIntervals['tatums']> {
        return this.observeActiveInterval('tatums') as Observable<ActiveIntervals['tatums']>;
    }

    getByteFrequencyData(data: Uint8Array): void {
        if (!this.active) {
            data.fill(0);
            return;
        }
        const bufferSize = data.length;
        const float32 = new Float32Array(bufferSize);
        const {minDecibels, maxDecibels} = this;
        this.getFloatFrequencyData(float32);
        for (let i = 0; i < bufferSize; i++) {
            // https://webaudio.github.io/web-audio-api/#dom-analysernode-getbytefrequencydata
            const value = (255 / (maxDecibels - minDecibels)) * (float32[i] - minDecibels);
            data[i] = clamp(0, value, 255);
        }
    }

    getByteTimeDomainData(data: Uint8Array): void {
        if (!this.active) {
            data.fill(128);
            return;
        }
        const bufferSize = data.length;
        const float32 = new Float32Array(bufferSize);
        this.getFloatTimeDomainData(float32);
        for (let i = 0; i < bufferSize; i++) {
            // https://webaudio.github.io/web-audio-api/#dom-analysernode-getbytetimedomaindata
            const value = 128 * (float32[i] + 1);
            data[i] = clamp(0, value, 255);
        }
    }

    getFloatFrequencyData(data: Float32Array): void {
        if (!this.active) {
            data.fill(-Infinity);
            return;
        }
        const bufferSize = data.length;
        const values = this.getFrequencyData(bufferSize);
        for (let i = 0; i < bufferSize; i++) {
            const value = values[i] * (this.maxDecibels - this.minDecibels) + this.minDecibels;
            data[i] = clamp(-180, value, 0);
        }
    }

    getFloatTimeDomainData(data: Float32Array): void {
        if (!this.active) {
            data.fill(0);
            return;
        }
        // More made up maths.
        const bufferSize = data.length;
        // const values = this.frequencyData.map((value) => clamp(-1, value * 2 - 1, 1));
        const values = this.getFrequencyData(bufferSize).map((value) => value * 2 - 1);
        const {real, imag} = ifft(values);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
        }
    }

    getFrequencyData(bufferSize: number): Float32Array {
        const data = new Float32Array(bufferSize);
        const pitches = this.segment.pitches;
        if (pitches) {
            const beat = interpolateBasis([0.3, 0.9, 0.3])(this.beat.progress) * this.volume;
            const brightness = this.segment.timbre[1];
            const centre = (brightness - 360) / 360;
            const bufferSize = data.length;
            const sampleSize = 22_050 / bufferSize;
            for (let i = 0; i < bufferSize; i++) {
                const radian = clamp(0, i / bufferSize - centre, 2);
                const amp = Math.sin((radian * Math.PI) / 2);
                const sample = samplePitches(pitches, i, sampleSize);
                const value = ((amp + sample) / 2) * beat;
                data[i] = value;
            }
        } else {
            data.fill(0);
        }
        return data;
    }

    private get activeIntervals(): ActiveIntervals {
        return this.activeIntervals$.value;
    }

    private observeActiveInterval(interval: IntervalType): Observable<ActiveInterval> {
        return this.observeActiveIntervals().pipe(
            map((activeIntervals) => activeIntervals[interval]),
            distinctUntilChanged()
        );
    }

    private observeActiveIntervals(): Observable<ActiveIntervals> {
        return observePaused().pipe(
            switchMap((paused) => (paused ? EMPTY : this.activeIntervals$)),
            filter(() => this.active)
        );
    }

    private start(): void {
        if (!this.animationFrameId) {
            this.animationFrameId = requestAnimationFrame((now) => this.tick(now));
        }
    }

    private stop(): void {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = 0;
        }
    }

    private tick(now: number): void {
        if (!this.active) {
            return;
        }
        this.updateQueues(now);
        this.animationFrameId = requestAnimationFrame((now) => this.tick(now));
    }

    private async updateTrackAnalysis(state: Spotify.PlaybackState | null): Promise<void> {
        const trackId = state?.track_window?.current_track?.id;
        if (trackId && this.currentTrackId !== trackId) {
            this.currentTrackId = trackId;
            this.trackAnalysis = null;
            this.queues = {
                volume: [0],
                beat: [0],
            };
            try {
                this.currentTrackAnalysis = await spotifyApi.getAudioAnalysisForTrack(trackId);
                state = await this.player!.getCurrentState(); // synch after fetch
            } catch (err) {
                logger.error(err);
                this.currentTrackAnalysis = null;
            }
        }

        if (this.currentTrackAnalysis && state) {
            this.updateTrackState(this.currentTrackAnalysis, state);
            this.active = !state.paused && !state.loading;
        } else {
            this.active = false;
        }

        if (this.active) {
            this.start();
        } else {
            this.stop();
        }
    }

    // The code below is based on code by zachwinter.

    private async updateTrackState(
        analysis: SpotifyApi.AudioAnalysisObject,
        state: Spotify.PlaybackState
    ): Promise<void> {
        this.trackAnalysis = structuredClone(analysis) as SpotifyApi.AudioAnalysisObject &
            ActiveIntervals;
        this.intervalTypes.forEach((intervalType) => {
            const intervals = this.trackAnalysis?.[intervalType];
            intervals?.forEach((interval) => {
                if (this.isSegment(interval)) {
                    interval.loudness_max_time = interval.loudness_max_time * 1000;
                }
                interval.start = (interval.start || 0) * 1000;
                interval.duration = (interval.duration || 0) * 1000;
            });
        });
        this.initialTrackProgress = state.position || 0;
        this.trackProgress = state.position || 0;
        this.initialStart = window.performance.now();
    }

    private setActiveIntervals(): void {
        const activeIntervals = this.activeIntervals;

        const determineInterval = (type: IntervalType): number => {
            const analysis = this.trackAnalysis![type];
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

        const easeOutQuart = (t: number): number => {
            t = clamp(0, t, 1);
            return 1 - --t * t * t * t;
        };

        this.intervalTypes.forEach((type: IntervalType) => {
            const index = determineInterval(type);
            if (activeIntervals[type].start == null || index !== activeIntervals[type].index) {
                activeIntervals[type] = <any>{
                    ...this.trackAnalysis![type][index],
                    index,
                };
            }
            const {start = 0, duration = 0} = activeIntervals[type];
            const elapsed = this.trackProgress - start;
            activeIntervals[type].elapsed = elapsed;
            activeIntervals[type].progress = easeOutQuart(elapsed / duration);
        });

        this.activeIntervals$.next(activeIntervals);
    }

    private getVolume(): number {
        const {loudness_max, loudness_start, loudness_max_time, duration, elapsed, start, index} =
            this.activeIntervals.segments;

        if (elapsed < loudness_max_time) {
            const progress = clamp(0, elapsed / loudness_max_time, 1);
            return interpolateNumber(loudness_start, loudness_max)(progress);
        } else {
            const next = this.trackAnalysis?.segments[index + 1]?.loudness_start || 0;
            const current = start + elapsed;
            const _start = start + loudness_max_time;
            const _elapsed = current - _start;
            const _duration = duration - loudness_max_time;
            const progress = clamp(0, _elapsed / _duration, 1);
            return interpolateNumber(loudness_max, next)(progress);
        }
    }

    private updateQueues(now: number): void {
        // Comments by zachwinter.

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
        this.#volume = sizeScale(beat) || 0;
    }

    private isSegment(segment: any): segment is SpotifyApi.AudioAnalysisSegment {
        return 'loudness_max_time' in segment;
    }
}

export default new SpotifyAudioAnalyser();
