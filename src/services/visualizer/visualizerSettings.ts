import type {Observable} from 'rxjs';
import {distinctUntilChanged, map, startWith} from 'rxjs';
import Visualizer from 'types/Visualizer';
import VisualizerSettings, {Randomness} from 'types/VisualizerSettings';
import {LiteStorage} from 'utils';

type VisualizerKeys = Pick<Visualizer, 'providerId' | 'name'>;

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

    set ambientVideoSource(ambientVideoSource: string) {
        if (ambientVideoSource !== this.ambientVideoSource) {
            storage.setString('ambientVideoSource', ambientVideoSource);
            if (this.lockedVisualizer?.providerId === 'ambientvideo') {
                storage.removeItem('lockedVisualizer');
            }
        }
    },

    get ambientVideoBeats(): boolean {
        return storage.getBoolean('ambientVideoBeats', true);
    },

    set ambientVideoBeats(ambientVideoBeats: boolean) {
        if (ambientVideoBeats !== this.ambientVideoBeats) {
            storage.setBoolean('ambientVideoBeats', ambientVideoBeats);
        }
    },

    get useAmbientVideoSource(): boolean {
        return storage.getBoolean('useAmbientVideoSource');
    },

    set useAmbientVideoSource(useAmbientVideoSource: boolean) {
        if (useAmbientVideoSource !== this.useAmbientVideoSource) {
            storage.setBoolean('useAmbientVideoSource', useAmbientVideoSource);
            if (this.lockedVisualizer?.providerId === 'ambientvideo') {
                storage.removeItem('lockedVisualizer');
            }
        }
    },

    get ampshaderTransparency(): boolean {
        return storage.getBoolean('ampshaderTransparency', true);
    },

    set ampshaderTransparency(ampshaderTransparency: boolean) {
        if (ampshaderTransparency !== this.ampshaderTransparency) {
            storage.setBoolean('ampshaderTransparency', ampshaderTransparency);
        }
    },

    get butterchurnTransparency(): boolean {
        return storage.getBoolean('butterchurnTransparency', true);
    },

    set butterchurnTransparency(butterchurnTransparency: boolean) {
        if (butterchurnTransparency !== this.butterchurnTransparency) {
            storage.setBoolean('butterchurnTransparency', butterchurnTransparency);
        }
    },

    get coverArtAnimatedBackground(): boolean {
        return storage.getBoolean('coverArtAnimatedBackground');
    },

    set coverArtAnimatedBackground(coverArtAnimatedBackground: boolean) {
        if (coverArtAnimatedBackground !== this.coverArtAnimatedBackground) {
            storage.setBoolean('coverArtAnimatedBackground', coverArtAnimatedBackground);
        }
    },

    get coverArtBeats(): boolean {
        return storage.getBoolean('coverArtBeats', true);
    },

    set coverArtBeats(coverArtBeats: boolean) {
        if (coverArtBeats !== this.coverArtBeats) {
            storage.setBoolean('coverArtBeats', coverArtBeats);
        }
    },

    get fullscreenProgress(): boolean {
        return storage.getBoolean('fullscreenProgress');
    },

    set fullscreenProgress(fullscreenProgress: boolean) {
        if (fullscreenProgress !== this.fullscreenProgress) {
            storage.setBoolean('fullscreenProgress', fullscreenProgress);
        }
    },

    get lockedVisualizer(): VisualizerKeys | null {
        return storage.getJson('lockedVisualizer');
    },

    set lockedVisualizer(lockedVisualizer: VisualizerKeys | null) {
        if (lockedVisualizer) {
            const {providerId, name} = lockedVisualizer;
            storage.setJson<VisualizerKeys>('lockedVisualizer', {providerId, name});
        } else {
            storage.removeItem('lockedVisualizer');
        }
    },

    get provider(): VisualizerSettings['provider'] {
        return storage.getString('provider') || 'random';
    },

    set provider(provider: VisualizerSettings['provider']) {
        if (provider !== this.provider) {
            storage.setString('provider', provider);
            if (provider && this.lockedVisualizer?.providerId !== provider) {
                storage.removeItem('lockedVisualizer');
            }
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
    return storage.observeChanges().pipe(
        startWith(undefined),
        map(() => ({...visualizerSettings}))
    );
}

export function observeVisualizerLocked(): Observable<boolean> {
    return observeVisualizerSettings().pipe(
        map((settings) => !!settings.lockedVisualizer),
        distinctUntilChanged()
    );
}

export function observeVisualizerProvider(): Observable<VisualizerSettings['provider']> {
    return observeVisualizerSettings().pipe(
        map((settings) => settings.provider),
        distinctUntilChanged()
    );
}

export function observeFullscreenProgressEnabled(): Observable<boolean> {
    return observeVisualizerSettings().pipe(
        map((settings) => settings.fullscreenProgress),
        distinctUntilChanged()
    );
}
