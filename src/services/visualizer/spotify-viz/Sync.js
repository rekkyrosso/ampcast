import Observe from './util/observe';
import interpolate from './util/interpolate';
import {scaleLog} from 'd3-scale';
import {min} from 'd3-array';
import ease from './util/easing';
import {spotifyApi} from 'services/spotify';
import spotifyPlayer from 'services/spotify/spotifyPlayer';

/**
 * @class Sync
 *
 * Creates an interface for analyzing a playing Spotify track in real time.
 * Exposes event hooks for reacting to changes in intervals.
 */
export default class Sync {
    currentTrackId = '';
    currentTrackAnalysis = null;

    constructor({volumeSmoothing = 100} = {}) {
        this.state = Observe({
            intervalTypes: ['tatums', 'segments', 'beats', 'bars', 'sections'],
            activeIntervals: Observe({
                tatums: {},
                segments: {},
                beats: {},
                bars: {},
                sections: {},
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

        spotifyPlayer.observeCurrentTrackState().subscribe(async (state) => {
            const trackId = state.track_window?.current_track?.id;
            if (trackId && this.currentTrackId !== trackId) {
                this.currentTrackId = trackId;
                try {
                    this.currentTrackAnalysis = await spotifyApi.getAudioAnalysisForTrack(trackId);
                    state = await spotifyPlayer.getCurrentState();
                } catch (err) {
                    console.error(err);
                    this.currentTrackAnalysis = null;
                    state = null;
                }
            }
            const active = !!this.currentTrackAnalysis && !!state && !state.paused && !state.loading;
            if (this.state.active !== active) {
                if (active) {
                    this.updateState(state);
                }
                this.state.active = active;
            }
        });

        this.initHooks();
    }

    get volumeSmoothing() {
        return this.state.volumeSmoothing;
    }

    set volumeSmoothing(volumeSmoothing) {
        this.state.volumeSmoothing = volumeSmoothing;
    }

    /**
     * @method initHooks - Initialize interval event hooks.
     */
    initHooks() {
        this.hooks = {
            tatum: () => {},
            segment: () => {},
            beat: () => {},
            bar: () => {},
            section: () => {},
        };

        this.state.activeIntervals.watch('tatums', (t) => this.hooks.tatum(t));
        this.state.activeIntervals.watch('segments', (s) => this.hooks.segment(s));
        this.state.activeIntervals.watch('beats', (b) => this.hooks.beat(b));
        this.state.activeIntervals.watch('bars', (b) => this.hooks.bar(b));
        this.state.activeIntervals.watch('sections', (s) => this.hooks.section(s));
    }

    /**
     * @method getTrackInfo - Fetch track analysis and track features of currently playing track.
     * @param {object} state - Response from Spotify API.
     */
    async updateState(state) {
        this.state.trackAnalysis = JSON.parse(JSON.stringify(this.currentTrackAnalysis));

        this.state.intervalTypes.forEach((t) => {
            const type = this.state.trackAnalysis[t];
            type[0].duration = type[0].start + type[0].duration;
            type[0].start = 0;
            type[type.length - 1].duration = state.duration / 1000 - type[type.length - 1].start;
            type.forEach((interval) => {
                if (interval.loudness_max_time) {
                    interval.loudness_max_time = interval.loudness_max_time * 1000;
                }
                interval.start = interval.start * 1000;
                interval.duration = interval.duration * 1000;
            });
        });

        this.state.initialTrackProgress = state.position;
        this.state.trackProgress = state.position;
        this.state.initialStart = window.performance.now();

        if (this.state.initialized === false) {
            this.state.initialized = true;
            requestAnimationFrame(this.tick.bind(this));
        }
    }

    /**
     * @method setActiveIntervals - Use current track progress to determine active intervals of each type.
     */
    setActiveIntervals() {
        const determineInterval = (type) => {
            const analysis = this.state.trackAnalysis[type];
            const progress = this.state.trackProgress;
            for (let i = 0; i < analysis.length; i++) {
                if (i === analysis.length - 1) return i;
                if (analysis[i].start < progress && progress < analysis[i + 1].start) return i;
            }
        };

        this.state.intervalTypes.forEach((type) => {
            const index = determineInterval(type);
            if (
                !this.state.activeIntervals[type].start ||
                index !== this.state.activeIntervals[type].index
            ) {
                this.state.activeIntervals[type] = {
                    ...this.state.trackAnalysis[type][index],
                    index,
                };
            }

            const {start, duration} = this.state.activeIntervals[type];
            const elapsed = this.state.trackProgress - start;
            this.state.activeIntervals[type].elapsed = elapsed;
            this.state.activeIntervals[type].progress = ease(elapsed / duration);
        });
    }

    /**
     * @method getVolume - Extract volume data from active segment.
     */
    getVolume() {
        const {loudness_max, loudness_start, loudness_max_time, duration, elapsed, start, index} =
            this.state.activeIntervals.segments;

        if (!this.state.trackAnalysis.segments[index + 1]) return 0;

        const next = this.state.trackAnalysis.segments[index + 1].loudness_start;
        const current = start + elapsed;

        if (elapsed < loudness_max_time) {
            const progress = Math.min(1, elapsed / loudness_max_time);
            return interpolate(loudness_start, loudness_max)(progress);
        } else {
            const _start = start + loudness_max_time;
            const _elapsed = current - _start;
            const _duration = duration - loudness_max_time;
            const progress = Math.min(1, _elapsed / _duration);
            return interpolate(loudness_max, next)(progress);
        }
    }

    /**
     * @method watch - Convenience method for watching data store.
     * @param {string} key
     * @param {function} method
     */
    watch(key, method) {
        this.state.watch(key, method);
    }

    /**
     * @method on - Convenience method for applying interval hooks.
     * @param {string} - Interval type.
     * @param {function} - Event handler.
     */
    on(interval, method) {
        this.hooks[interval] = method;
    }

    /**
     * @getter isActive - Returns if class is actively syncing with a playing track.
     */
    get isActive() {
        return this.state.active === true;
    }

    get tatum() {
        return this.state.activeIntervals.tatums;
    }

    get segment() {
        return this.state.activeIntervals.segments;
    }

    get beat() {
        return this.state.activeIntervals.beats;
    }

    get bar() {
        return this.state.activeIntervals.bars;
    }

    get section() {
        return this.state.activeIntervals.sections;
    }

    /**
     * @method getInterval - Convenience method for retrieving active interval of type.
     * @param {string} type - Interval type, e.g. `beat` or `tatum`
     */
    getInterval(type) {
        return this.state.activeIntervals[type + 's'];
    }

    /**
     * @method tick - A single update tick from the Sync loop.
     * @param {DOMHighResTimeStamp} now
     */
    tick(now) {
        requestAnimationFrame(this.tick.bind(this));
        if (!this.state.active) return;

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

        function average(arr) {
            return arr.reduce((a, b) => a + b) / arr.length;
        }

        /** Scale volume (dB) to a linear range using the minimum and average values of the volume queue. */
        const sizeScale = scaleLog()
            .domain([min(queues.volume), average(queues.volume)])
            .range([0, 1]);

        /** Average the beat queue, then pass it to our size scale. */
        const beat = average(queues.beat);
        this.volume = sizeScale(beat);
    }
}
