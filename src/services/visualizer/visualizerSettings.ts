import type {Observable} from 'rxjs';
import {map, startWith} from 'rxjs';
import VisualizerSettings, {Randomness} from 'types/VisualizerSettings';
import {LiteStorage} from 'utils';

const defaultRandomness: Randomness = {
    none: 0,
    ambientvideo: 0,
    ampshader: 10,
    audiomotion: 4,
    butterchurn: 74,
    coverart: 1,
    spotifyviz: 0,
    waveform: 1,
};

const defaultSpotifyRandomness: Randomness = {
    none: 0,
    ambientvideo: 0,
    ampshader: 60,
    audiomotion: 9,
    butterchurn: 4,
    coverart: 1,
    spotifyviz: 6,
    waveform: 0,
};

const storage = new LiteStorage('visualizer/settings');

const visualizerSettings: VisualizerSettings = {
    get ambientVideoSource(): string {
        return storage.getString('ambientVideoSource');
    },

    set ambientVideoSource(source: string) {
        storage.setString('ambientVideoSource', source);
    },

    get ambientVideoBeats(): boolean {
        return storage.getBoolean('ambientVideoBeats', true);
    },

    set ambientVideoBeats(enabled: boolean) {
        storage.setBoolean('ambientVideoBeats', enabled);
    },

    get useAmbientVideoSource(): boolean {
        return storage.getBoolean('useAmbientVideoSource');
    },

    set useAmbientVideoSource(enabled: boolean) {
        storage.setBoolean('useAmbientVideoSource', enabled);
    },

    get ampshaderTransparency(): boolean {
        return storage.getBoolean('ampshaderTransparency', true);
    },

    set ampshaderTransparency(enabled: boolean) {
        storage.setBoolean('ampshaderTransparency', enabled);
    },

    get butterchurnTransitionDelay(): number {
        return storage.getNumber('butterchurnTransitionDelay', 120);
    },

    set butterchurnTransitionDelay(delay: number) {
        storage.setNumber('butterchurnTransitionDelay', delay);
    },

    get butterchurnTransitionDuration(): number {
        return storage.getNumber('butterchurnTransitionDuration', 5.5);
    },

    set butterchurnTransitionDuration(duration: number) {
        storage.setNumber('butterchurnTransitionDuration', duration);
    },

    get butterchurnTransparency(): boolean {
        return storage.getBoolean('butterchurnTransparency', true);
    },

    set butterchurnTransparency(enabled: boolean) {
        storage.setBoolean('butterchurnTransparency', enabled);
    },

    get coverArtAnimatedBackground(): boolean {
        return storage.getBoolean('coverArtAnimatedBackground');
    },

    set coverArtAnimatedBackground(enabled: boolean) {
        storage.setBoolean('coverArtAnimatedBackground', enabled);
    },

    get coverArtBeats(): boolean {
        return storage.getBoolean('coverArtBeats', true);
    },

    set coverArtBeats(enabled: boolean) {
        storage.setBoolean('coverArtBeats', enabled);
    },

    get fullscreenProgress(): boolean {
        return storage.getBoolean('fullscreenProgress');
    },

    set fullscreenProgress(enabled: boolean) {
        storage.setBoolean('fullscreenProgress', enabled);
    },

    get lockedVisualizer(): VisualizerSettings['lockedVisualizer'] {
        return storage.getJson('lockedVisualizer');
    },

    set lockedVisualizer(visualizer: VisualizerSettings['lockedVisualizer']) {
        if (visualizer) {
            const {providerId, name} = visualizer;
            storage.setJson('lockedVisualizer', {providerId, name});
        } else {
            storage.removeItem('lockedVisualizer');
        }
    },

    get provider(): VisualizerSettings['provider'] {
        return storage.getString('provider') || 'random';
    },

    set provider(provider: VisualizerSettings['provider']) {
        if (provider !== this.provider) {
            storage.removeItem('lockedVisualizer');
            storage.setString('provider', provider);
        }
    },

    get randomness(): Randomness {
        return storage.getJson('randomness', defaultRandomness);
    },

    set randomness(randomness: Randomness) {
        storage.setJson('randomness', randomness);
    },

    get spotifyRandomness(): Randomness {
        return storage.getJson('spotifyRandomness', defaultSpotifyRandomness);
    },

    set spotifyRandomness(randomness: Randomness) {
        storage.setJson('spotifyRandomness', randomness);
    },
};

export default visualizerSettings;

export function observeVisualizerSettings(): Observable<Readonly<VisualizerSettings>> {
    return storage.observeChange().pipe(
        startWith(undefined),
        map(() => ({...visualizerSettings}))
    );
}
